#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'publish-all-content-drafts-report.json');
const outMd = path.join(docsDir, 'publish-all-content-drafts-report.md');

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

const databaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL veya PROD_DATABASE_URL gerekli');
}

const publishableTables = [
  { table: 'blog_posts', from: ['draft', 'scheduled'], to: 'published', extraSet: `published_at = COALESCE(published_at, NOW())` },
  { table: 'events', from: ['draft'], to: 'published', extraSet: null },
  { table: 'recipes', from: ['draft'], to: 'published', extraSet: null },
  { table: 'historical_sites', from: ['draft'], to: 'published', extraSet: null },
  { table: 'places', from: ['draft', 'pending'], to: 'active', extraSet: null },
];

const moderationTables = [
  'blog_comments',
  'reviews',
  'community_photos',
  'event_submissions',
  'moderation_queue',
];

async function tableExists(client, table) {
  const result = await client.query('SELECT to_regclass($1) AS table_name', [`public.${table}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function hasColumn(client, table, column) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return result.rowCount > 0;
}

async function statusCounts(client, table) {
  if (!(await tableExists(client, table)) || !(await hasColumn(client, table, 'status'))) return null;
  const result = await client.query(`SELECT status, COUNT(*)::int AS count FROM ${table} GROUP BY status ORDER BY status`);
  return Object.fromEntries(result.rows.map((row) => [String(row.status), Number(row.count)]));
}

async function publishTable(client, item) {
  if (!(await tableExists(client, item.table)) || !(await hasColumn(client, item.table, 'status'))) {
    return { table: item.table, skipped: true, reason: 'missing-table-or-status-column', updated: 0 };
  }
  const hasUpdatedAt = await hasColumn(client, item.table, 'updated_at');
  const setParts = ['status = $1'];
  if (hasUpdatedAt) setParts.push('updated_at = NOW()');
  if (item.extraSet) setParts.push(item.extraSet);
  const result = await client.query(
    `UPDATE ${item.table}
     SET ${setParts.join(', ')}
     WHERE status = ANY($2::text[])`,
    [item.to, item.from],
  );
  return { table: item.table, from: item.from, to: item.to, updated: result.rowCount ?? 0 };
}

async function approveCityDrafts(client) {
  const table = 'city_content_drafts';
  if (!(await tableExists(client, table))) return { table, skipped: true, reason: 'missing-table', updated: 0 };
  const result = await client.query(
    `UPDATE city_content_drafts
     SET status = 'approved',
         approved_at = COALESCE(approved_at, NOW()),
         updated_at = NOW(),
         admin_notes = CONCAT(
           COALESCE(admin_notes, ''),
           CASE WHEN COALESCE(admin_notes, '') = '' THEN '' ELSE E'\n' END,
           'Toplu yayın: pending taslaklar yayına alındı.'
         )
     WHERE status = 'pending'`,
  );
  return { table, from: ['pending'], to: 'approved', updated: result.rowCount ?? 0 };
}

const client = new pg.Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
  application_name: 'sanliurfa-publish-all-content-drafts',
});

await client.connect();
try {
  const before = {};
  for (const item of [...publishableTables.map((item) => item.table), 'city_content_drafts', ...moderationTables]) {
    before[item] = await statusCounts(client, item);
  }

  await client.query('BEGIN');
  const updates = [];
  for (const item of publishableTables) updates.push(await publishTable(client, item));
  updates.push(await approveCityDrafts(client));
  await client.query('COMMIT');

  const after = {};
  for (const item of [...publishableTables.map((item) => item.table), 'city_content_drafts', ...moderationTables]) {
    after[item] = await statusCounts(client, item);
  }

  const remainingDraftLike = Object.entries(after)
    .filter(([, counts]) => counts)
    .flatMap(([table, counts]) =>
      Object.entries(counts)
        .filter(([status]) => ['draft', 'scheduled'].includes(status) || (table === 'city_content_drafts' && status === 'pending'))
        .map(([status, count]) => ({ table, status, count })),
    );

  const moderationPending = Object.entries(after)
    .filter(([table, counts]) => moderationTables.includes(table) && counts)
    .flatMap(([table, counts]) =>
      Object.entries(counts)
        .filter(([status]) => ['pending', 'flagged', 'needs_info'].includes(status))
        .map(([status, count]) => ({ table, status, count })),
    );

  const report = {
    generatedAt: new Date().toISOString(),
    status: remainingDraftLike.length === 0 ? 'ok' : 'review',
    policy: {
      localStorageOnly: true,
      publishGeneratedBlogDrafts: true,
      approveCityContentDrafts: true,
      moderationQueuesAutoApproved: false,
    },
    before,
    updates,
    after,
    remainingDraftLike,
    moderationPending,
  };

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    outMd,
    [
      '# Publish All Content Drafts',
      '',
      `- Generated at: ${report.generatedAt}`,
      `- Status: ${report.status}`,
      `- Moderation queues auto-approved: ${report.policy.moderationQueuesAutoApproved ? 'yes' : 'no'}`,
      '',
      '| Table | Updated | From | To |',
      '|---|---:|---|---|',
      ...updates.map((item) => `| ${item.table} | ${item.updated ?? 0} | ${(item.from || []).join(', ')} | ${item.to || ''} |`),
      '',
      '## Remaining Draft-Like Content',
      '',
      ...(remainingDraftLike.length
        ? remainingDraftLike.map((item) => `- ${item.table}: ${item.status}=${item.count}`)
        : ['- none']),
      '',
      '## Moderation Pending Kept Manual',
      '',
      ...(moderationPending.length
        ? moderationPending.map((item) => `- ${item.table}: ${item.status}=${item.count}`)
        : ['- none']),
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(
    `publish-all-content-drafts: ${report.status.toUpperCase()} ` +
      updates.map((item) => `${item.table}=${item.updated ?? 0}`).join(', '),
  );
  process.exit(report.status === 'ok' ? 0 : 1);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end();
}
