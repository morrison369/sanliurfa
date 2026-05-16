#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-runtime-hold-plan.json');
const outMd = path.join(docsDir, 'db-runtime-hold-plan.md');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

for (const file of [
  path.join(root, '.env'),
  path.join(root, '.env.local'),
  path.join(root, '.env.production'),
  path.join(root, 'scripts/.env.scripts'),
]) {
  loadEnv(file);
}

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function scanFile(rel, patterns) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  return lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((item) => patterns.some((pattern) => pattern.test(item.text)));
}

async function loadColumns() {
  const databaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
  if (!databaseUrl) return { available: false, columns: [] };
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    application_name: 'sanliurfa-db-runtime-hold-plan',
  });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'campaign_performance'
       ORDER BY ordinal_position`,
    );
    return {
      available: true,
      columns: result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
      })),
    };
  } finally {
    await client.end();
  }
}

const evidence = readJsonSafe('docs/db-advisory-evidence-bundle.json');
const runtimeHold = (evidence?.runtimeHolds || []).find((item) => item.table === 'public.campaign_performance');
const sourceContracts = [
  {
    area: 'business-marketing',
    file: 'src/lib/marketing/marketing-campaigns.ts',
    expectedColumns: ['campaign_id', 'date', 'impressions', 'clicks', 'conversions', 'spent', 'revenue'],
    references: scanFile('src/lib/marketing/marketing-campaigns.ts', [
      /campaign_performance/,
      /\bdate\b/,
      /\bimpressions\b/,
      /\bclicks\b/,
      /\bconversions\b/,
      /\bspent\b/,
      /\brevenue\b/,
    ]),
  },
  {
    area: 'email-analytics',
    file: 'src/lib/email/email-analytics.ts',
    expectedColumns: [
      'campaign_id',
      'metric_date',
      'sends',
      'opens',
      'clicks',
      'conversions',
      'bounces',
      'unsubscribes',
      'complaints',
      'revenue_cents',
    ],
    references: scanFile('src/lib/email/email-analytics.ts', [
      /campaign_performance/,
      /metric_date/,
      /\bsends\b/,
      /\bopens\b/,
      /\bbounces\b/,
      /\bunsubscribes\b/,
      /\bcomplaints\b/,
      /revenue_cents/,
    ]),
  },
];

const schema = await loadColumns();
const liveColumnNames = new Set(schema.columns.map((column) => column.name));
const contractResults = sourceContracts.map((contract) => {
  const missingLiveColumns = contract.expectedColumns.filter((column) => !liveColumnNames.has(column));
  return {
    ...contract,
    liveCompatible: schema.available ? missingLiveColumns.length === 0 : null,
    missingLiveColumns,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  status: runtimeHold ? 'runtime_hold' : 'clear',
  policy: {
    destructiveActionsAllowed: false,
    automaticDropAllowed: false,
    automaticMigrationAllowed: false,
  },
  summary: {
    table: 'public.campaign_performance',
    runtimeReferenceCount: runtimeHold?.runtimeReferenceCount ?? 0,
    sourceContractCount: contractResults.length,
    schemaAvailable: schema.available,
    liveColumnCount: schema.columns.length,
    incompatibleContractCount: contractResults.filter((item) => item.liveCompatible === false).length,
  },
  liveSchema: schema,
  sourceContracts: contractResults,
  decision: runtimeHold
    ? {
        action: 'keep-table-runtime-hold',
        reason:
          'campaign_performance iki runtime akışı tarafından okunuyor; şema sözleşmeleri netleştirilmeden drop/quarantine güvenli değil.',
        nextSafeSteps: [
          'Marketing ve email analytics için tek canonical performans tablosu seç.',
          'Diğer akışı yeni tabloya veya compatibility view katmanına taşı.',
          'Runtime referansları sıfırlanmadan db:retirement:observe sonucunu manuel aksiyona yükseltme.',
          'Migration ve rollback PR hazırlanırsa önce staging smoke, sonra 14 günlük gözlem tamamlanmalı.',
        ],
      }
    : {
        action: 'no-runtime-hold',
        reason: 'campaign_performance için aktif runtime hold bulunmadı.',
        nextSafeSteps: ['db:retirement:observe raporunu yeniden kontrol et.'],
      },
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Runtime Hold Plan',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Table: ${report.summary.table}`,
    `- Runtime references: ${report.summary.runtimeReferenceCount}`,
    `- Live schema available: ${report.summary.schemaAvailable ? 'yes' : 'no'}`,
    `- Automatic drop: ${report.policy.automaticDropAllowed ? 'yes' : 'no'}`,
    '',
    '## Source Contracts',
    '',
    '| Area | File | Live Compatible | Missing Live Columns |',
    '|---|---|---|---|',
    ...report.sourceContracts.map(
      (item) =>
        `| ${item.area} | ${item.file} | ${item.liveCompatible === null ? 'unknown' : item.liveCompatible ? 'yes' : 'no'} | ${item.missingLiveColumns.join(', ')} |`,
    ),
    '',
    '## Next Safe Steps',
    '',
    ...report.decision.nextSafeSteps.map((step) => `- ${step}`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-runtime-hold-plan: ${report.status.toUpperCase()} refs=${report.summary.runtimeReferenceCount} incompatible=${report.summary.incompatibleContractCount}`,
);
