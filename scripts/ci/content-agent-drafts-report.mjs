#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'content-agent-drafts-report.json');
const outMd = path.join(docsDir, 'content-agent-drafts-report.md');

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

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL veya PROD_DATABASE_URL gerekli');

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    application_name: 'sanliurfa-content-agent-drafts-report',
  });

  await client.connect();
  try {
    const exists = await client.query(`
      SELECT to_regclass('public.city_content_drafts') AS table_name
    `);
    if (!exists.rows[0]?.table_name) {
      const emptyReport = {
        generatedAt: new Date().toISOString(),
        status: 'blocked',
        reason: 'city_content_drafts tablosu yok',
      };
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(outJson, `${JSON.stringify(emptyReport, null, 2)}\n`, 'utf8');
      fs.writeFileSync(outMd, '# Content Agent Drafts\n\n- Status: blocked\n- Reason: city_content_drafts tablosu yok\n', 'utf8');
      console.log('content-agent-drafts-report: BLOCKED (table missing)');
      process.exit(1);
    }

    const statusRows = await client.query(`
        SELECT status, COUNT(*)::int AS count
        FROM city_content_drafts
        GROUP BY status
        ORDER BY status ASC
      `);
    const typeRows = await client.query(`
        SELECT draft_type, COUNT(*)::int AS count
        FROM city_content_drafts
        GROUP BY draft_type
        ORDER BY draft_type ASC
      `);
    const staleRows = await client.query(`
        SELECT id, draft_type, entity_key, title, status, updated_at
        FROM city_content_drafts
        WHERE status = 'pending'
          AND updated_at < NOW() - INTERVAL '30 days'
        ORDER BY updated_at ASC
        LIMIT 25
      `);

    const byStatus = Object.fromEntries(statusRows.rows.map((row) => [row.status, Number(row.count)]));
    const byType = Object.fromEntries(typeRows.rows.map((row) => [row.draft_type, Number(row.count)]));
    const total = Object.values(byStatus).reduce((sum, count) => sum + Number(count), 0);
    const pending = Number(byStatus.pending || 0);
    const stalePendingCount = staleRows.rows.length;

    const report = {
      generatedAt: new Date().toISOString(),
      status: stalePendingCount > 0 ? 'review' : 'ok',
      summary: {
        total,
        pending,
        approved: Number(byStatus.approved || 0),
        rejected: Number(byStatus.rejected || 0),
        stalePendingCount,
      },
      byStatus,
      byType,
      policy: {
        autoPublish: false,
        adminApprovalRequired: true,
        stalePendingReviewDays: 30,
      },
      stalePendingSamples: staleRows.rows.map((row) => ({
        id: row.id,
        draftType: row.draft_type,
        entityKey: row.entity_key,
        title: row.title,
        status: row.status,
        updatedAt: row.updated_at,
      })),
    };

    const md = [
      '# Content Agent Drafts',
      '',
      `- Status: ${report.status}`,
      `- Total: ${total}`,
      `- Pending: ${pending}`,
      `- Approved: ${report.summary.approved}`,
      `- Rejected: ${report.summary.rejected}`,
      `- Stale pending: ${stalePendingCount}`,
      '',
      '## By Type',
      '',
      ...Object.entries(byType).map(([key, count]) => `- ${key}: ${count}`),
      '',
      '## Policy',
      '',
      '- Auto publish: false',
      '- Admin approval required: true',
      '- CDN/object storage: not used',
      '',
    ].join('\n');

    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(outMd, md, 'utf8');

    console.log(
      `content-agent-drafts-report: ${report.status.toUpperCase()} ` +
        `(total=${total}, pending=${pending}, stale=${stalePendingCount})`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`content-agent-drafts-report: ${error.message}`);
  process.exit(1);
});
