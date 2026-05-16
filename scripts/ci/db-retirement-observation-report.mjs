#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const snapshotsDir = path.join(docsDir, 'db-retirement-observations');
const auditPath = path.join(docsDir, 'db-usage-audit.json');
const outJson = path.join(docsDir, 'db-retirement-observation-report.json');
const outMd = path.join(docsDir, 'db-retirement-observation-report.md');
const observationDays = Number.parseInt(process.env.DB_RETIREMENT_OBSERVATION_DAYS || '14', 10);
const snapshotRetentionDays = Number.parseInt(process.env.DB_RETIREMENT_SNAPSHOT_RETENTION_DAYS || '30', 10);

function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function snapshotDate(date) {
  return date.toISOString().slice(0, 10);
}

function tableEvidence(table) {
  const map = {
    'public.campaign_metrics': {
      owner: 'marketing campaign analytics',
      sourceFiles: [
        'src/migrations/104_marketing_campaigns.ts',
        'src/components/MarketingCampaignBuilder.tsx',
        'src/pages/api/marketing-campaigns/[id]/analytics.ts',
      ],
      migrationSources: ['104_marketing_campaigns.ts'],
      replacementTables: ['marketing_campaigns', 'campaign_performance'],
      note: 'Marketing campaign v2 metrics table. Zero-row signal alone is not enough; confirm analytics endpoint and UI no longer depend on this physical table before quarantine.',
    },
    'public.campaign_performance': {
      owner: 'email/marketing campaign performance',
      sourceFiles: [
        'src/migrations/064_marketing_campaigns.ts',
        'src/migrations/073_email_campaigns.ts',
        'src/lib/email/email-campaigns.ts',
        'src/pages/api/marketing-campaigns/[id]/analytics.ts',
      ],
      migrationSources: ['064_marketing_campaigns.ts', '073_email_campaigns.ts'],
      replacementTables: [],
      note: 'Duplicate-era campaign performance table. Requires migration ownership review because both marketing and email campaign migrations touched it.',
    },
    'public.campaign_segments': {
      owner: 'marketing campaign targeting',
      sourceFiles: [
        'src/migrations/104_marketing_campaigns.ts',
        'src/pages/api/marketing-campaigns/[id]/targeting.ts',
        'src/lib/marketing/marketing-campaigns.ts',
      ],
      migrationSources: ['104_marketing_campaigns.ts'],
      replacementTables: ['campaign_targeting'],
      note: 'Marketing campaign segment bridge. Confirm targeting API and campaign UI no longer write/read before quarantine.',
    },
  };

  return map[table] || {
    owner: 'unclassified',
    sourceFiles: [],
    migrationSources: [],
    replacementTables: [],
    note: 'Ownership metadata missing; source/reference review required before any action.',
  };
}

function sourceReferenceEvidence(tableName, migrationSources = []) {
  const bareTable = tableName.replace(/^public\./, '');
  const searchDirs = ['src/lib', 'src/pages', 'src/components', 'src/actions', 'src/data'];
  const migrationSet = new Set(migrationSources.map((item) => item.replace(/\\/g, '/')));
  const references = [];

  for (const dir of searchDirs) {
    const absDir = path.join(root, dir);
    if (!fs.existsSync(absDir)) continue;
    const stack = [absDir];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const abs = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(abs);
          continue;
        }
        if (!/\.(ts|tsx|astro|js|mjs)$/.test(entry.name)) continue;
        const rel = path.relative(root, abs).replace(/\\/g, '/');
        const text = fs.readFileSync(abs, 'utf8');
        if (!new RegExp(`\\b${bareTable}\\b`).test(text)) continue;
        references.push({
          file: rel,
          migrationOnly: migrationSet.has(path.basename(rel)) || rel.includes('/migrations/'),
        });
      }
    }
  }

  const runtimeReferences = references.filter((item) => !item.migrationOnly);
  return {
    table: tableName,
    runtimeReferenceCount: runtimeReferences.length,
    migrationReferenceCount: references.length - runtimeReferences.length,
    runtimeReferences,
    status: runtimeReferences.length > 0 ? 'runtime_hold' : 'no_runtime_reference',
  };
}

function readSnapshots() {
  if (!fs.existsSync(snapshotsDir)) return [];
  return fs.readdirSync(snapshotsDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .slice(-30)
    .map((file) => readJsonSafe(path.join(snapshotsDir, file)))
    .filter(Boolean);
}

function cleanupOldSnapshots(now) {
  if (!fs.existsSync(snapshotsDir)) return [];
  const removed = [];
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - snapshotRetentionDays);

  for (const file of fs.readdirSync(snapshotsDir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) continue;
    const datePart = file.slice(0, 10);
    const snapshotTime = new Date(`${datePart}T00:00:00.000Z`);
    if (Number.isNaN(snapshotTime.getTime()) || snapshotTime >= cutoff) continue;
    fs.unlinkSync(path.join(snapshotsDir, file));
    removed.push(file);
  }

  return removed;
}

const audit = readJsonSafe(auditPath);
const generatedAt = new Date();
const p0 = audit?.retirementPlan?.p0DropCandidates || [];
const p1 = audit?.retirementPlan?.p1ReviewCandidates || [];
const p2 = audit?.retirementPlan?.p2UnusedIndexCandidates || [];
const p0WithEvidence = p0.slice(0, 50).map((item) => {
  const evidence = tableEvidence(item.table);
  const sourceReferences = sourceReferenceEvidence(item.table, evidence.migrationSources);
  const hasRuntimeReferences = sourceReferences.runtimeReferenceCount > 0;
  return {
    ...item,
    evidence,
    sourceReferences,
    action: hasRuntimeReferences ? 'runtime_reference_hold' : 'observe_then_quarantine_migration',
    blocker: hasRuntimeReferences
      ? 'runtime source references present'
      : 'production observation evidence missing',
  };
});
const p0QuarantineCandidates = p0WithEvidence.filter(
  (item) => item.sourceReferences.status === 'no_runtime_reference',
);
const p0RuntimeHolds = p0WithEvidence.filter(
  (item) => item.sourceReferences.status === 'runtime_hold',
);

const report = {
  generatedAt: generatedAt.toISOString(),
  status: audit?.status === 'ok' ? 'observation_required' : 'audit_unavailable',
  sourceAudit: 'docs/db-usage-audit.json',
  policy: {
    observationDays,
    earliestActionAt: addDays(generatedAt, observationDays).toISOString(),
    automaticDropAllowed: false,
    automaticIndexDropAllowed: false,
    requiredEvidence: [
      '14 gun production pg_stat_user_tables / pg_stat_user_indexes gozlemi',
      'kod referansi ve migration sahipligi kontrolu',
      'unique/primary/foreign-key constraint etkisi kontrolu',
      'EXPLAIN/query plan review',
      'rollback migration veya restore plani',
    ],
  },
  summary: {
    p0DropCandidateCount: audit?.retirementPlan?.p0DropCandidateCount || p0.length,
    p0QuarantineCandidateCount: p0QuarantineCandidates.length,
    p0RuntimeHoldCount: p0RuntimeHolds.length,
    p1ReviewCandidateCount: audit?.retirementPlan?.p1ReviewCandidateCount || p1.length,
    p2UnusedIndexCandidateCount: audit?.retirementPlan?.p2UnusedIndexCandidateCount || p2.length,
  },
  actionQueue: {
    p0: p0QuarantineCandidates,
    p0RuntimeHold: p0RuntimeHolds,
    p1: p1.slice(0, 50).map((item) => ({
      ...item,
      action: 'ownership_and_code_reference_review',
      blocker: 'unclassified ownership unresolved',
    })),
    p2: p2.slice(0, 50).map((item) => ({
      ...item,
      action: 'index_usage_and_query_plan_review',
      blocker: 'idx_scan=0 alone is not sufficient evidence',
    })),
  },
};

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(snapshotsDir, { recursive: true });
const snapshotPath = path.join(snapshotsDir, `${snapshotDate(generatedAt)}.json`);
fs.writeFileSync(snapshotPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const removedSnapshots = cleanupOldSnapshots(generatedAt);
const snapshots = readSnapshots();
report.snapshots = {
  directory: 'docs/db-retirement-observations',
  latest: path.relative(root, snapshotPath).replace(/\\/g, '/'),
  count: snapshots.length,
  retentionDays: snapshotRetentionDays,
  removedOldSnapshots: removedSnapshots,
  lastObservationAt: snapshots.at(-1)?.generatedAt || report.generatedAt,
  firstObservationAt: snapshots[0]?.generatedAt || report.generatedAt,
  stableEnoughForAction: snapshots.length >= observationDays,
};
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# DB Retirement Observation Report',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  `- Source audit: \`${report.sourceAudit}\``,
  `- Observation window: ${report.policy.observationDays} days`,
  `- Earliest action at: ${report.policy.earliestActionAt}`,
  `- Automatic table drop allowed: ${report.policy.automaticDropAllowed ? 'yes' : 'no'}`,
  `- Automatic index drop allowed: ${report.policy.automaticIndexDropAllowed ? 'yes' : 'no'}`,
  `- Snapshot count: ${report.snapshots.count}`,
  `- Snapshot retention: ${report.snapshots.retentionDays} days`,
  `- Removed old snapshots: ${report.snapshots.removedOldSnapshots.length}`,
  `- Stable enough for action: ${report.snapshots.stableEnoughForAction ? 'yes' : 'no'}`,
  '',
  '## Summary',
  '',
  '| Queue | Count | Action |',
  '|---|---:|---|',
  `| P0 | ${report.summary.p0DropCandidateCount} | observe then quarantine/drop migration candidate |`,
  `| P0 quarantine candidates | ${report.summary.p0QuarantineCandidateCount} | no runtime source reference; still requires observation evidence |`,
  `| P0 runtime holds | ${report.summary.p0RuntimeHoldCount} | runtime code reference present; no drop/quarantine action |`,
  `| P1 | ${report.summary.p1ReviewCandidateCount} | ownership and code-reference review |`,
  `| P2 | ${report.summary.p2UnusedIndexCandidateCount} | index usage and EXPLAIN review |`,
  '',
  '## Required Evidence',
  '',
  ...report.policy.requiredEvidence.map((item) => `- ${item}`),
  '',
  '## P0 Action Queue Sample',
  '',
  '| Table | Owner | Migration Source | Action | Blocker |',
  '|---|---|---|---|---|',
  ...report.actionQueue.p0.slice(0, 20).map((item) => `| ${item.table} | ${item.evidence.owner} | ${item.evidence.migrationSources.join(', ')} | ${item.action} | ${item.blocker} |`),
  '',
  '## P0 Runtime Hold Queue',
  '',
  '| Table | Runtime References | Action | Blocker |',
  '|---|---:|---|---|',
  ...report.actionQueue.p0RuntimeHold.slice(0, 20).map((item) => `| ${item.table} | ${item.sourceReferences.runtimeReferenceCount} | ${item.action} | ${item.blocker} |`),
  '',
  '## P2 Index Queue Sample',
  '',
  '| Table | Index | Action | Blocker |',
  '|---|---|---|---|',
  ...report.actionQueue.p2.slice(0, 20).map((item) => `| ${item.table} | ${item.index} | ${item.action} | ${item.blocker} |`),
  '',
  'Not: Bu rapor operasyon kuyruğu üretir; migration/drop işlemi yapmaz.',
  '',
];

fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');

console.log(
  `db-retirement-observation-report: ${report.status.toUpperCase()} (P0=${report.summary.p0DropCandidateCount}, P1=${report.summary.p1ReviewCandidateCount}, P2=${report.summary.p2UnusedIndexCandidateCount})`,
);
