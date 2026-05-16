#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-prod-version-compare-report.json');
const outMd = path.join(docsDir, 'db-prod-version-compare-report.md');
const envFiles = ['.env', '.env.local', '.env.production', path.join('scripts', '.env.scripts')];

function loadEnvFiles() {
  for (const relPath of envFiles) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    for (const rawLine of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) {
        continue;
      }

      const [key, ...valueParts] = line.split('=');
      const name = key.trim();
      if (!name || process.env[name] !== undefined) {
        continue;
      }

      let value = valueParts.join('=').trim();
      value = value.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
      process.env[name] = value;
    }
  }
}

function targetFromUrl(connectionString, source) {
  try {
    const url = new URL(connectionString);
    return {
      source,
      host: url.hostname || 'unknown',
      port: url.port || '5432',
      database: url.pathname.replace(/^\//, '') || 'unknown',
    };
  } catch {
    return { source, host: 'unparseable', port: 'unknown', database: 'unknown' };
  }
}

function sourceMigrationFiles() {
  const dir = path.join(root, 'src', 'migrations');
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.ts') && /^\d{3}_/.test(file))
    .sort()
    .map((filename) => ({
      filename,
      version: filename.replace(/\.ts$/, ''),
    }));
}

async function querySafe(client, sql, fallback = []) {
  try {
    const result = await client.query(sql);
    return result.rows;
  } catch {
    return fallback;
  }
}

function writeReport(report) {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# DB Production Version Compare Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Database source: ${report.database.source}`,
    `- Database target: ${report.database.host}:${report.database.port}/${report.database.database}`,
    `- Source migration files: ${report.summary.sourceMigrationFileCount}`,
    `- DB schema_migrations rows: ${report.summary.schemaMigrationCount}`,
    `- Applied source matches: ${report.summary.appliedSourceMatchCount}`,
    `- Source pending/unmatched: ${report.summary.sourcePendingCount}`,
    `- DB-only migrations: ${report.summary.dbOnlyCount}`,
    '',
  ];

  if (report.status !== 'ok') {
    lines.push(`Detail: ${report.detail}`);
    fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
    return;
  }

  lines.push('## Database Runtime');
  lines.push('');
  lines.push(`- PostgreSQL: ${report.runtime.pgVersion}`);
  lines.push(`- Current database: ${report.runtime.currentDatabase}`);
  lines.push(`- Server port: ${report.runtime.serverPort}`);
  lines.push('');
  lines.push('## Recent Applied Migrations');
  lines.push('');
  lines.push('| Version | Filename | Executed At |');
  lines.push('|---|---|---|');
  lines.push(...report.recentAppliedMigrations.map((item) => `| ${item.version} | ${item.filename || ''} | ${item.executedAt || ''} |`));
  lines.push('');
  lines.push('## Source Pending / Unmatched Sample');
  lines.push('');
  lines.push('| Version | Filename |');
  lines.push('|---|---|');
  lines.push(...report.sourcePendingSample.map((item) => `| ${item.version} | ${item.filename} |`));
  lines.push('');
  lines.push('## DB-Only Migration Sample');
  lines.push('');
  lines.push('| Version | Filename |');
  lines.push('|---|---|');
  lines.push(...report.dbOnlySample.map((item) => `| ${item.version} | ${item.filename || ''} |`));
  lines.push('');

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  loadEnvFiles();

  const connectionString = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
  const source = process.env.PROD_DATABASE_URL ? 'PROD_DATABASE_URL' : process.env.DATABASE_URL ? 'DATABASE_URL' : 'missing';
  const files = sourceMigrationFiles();
  const fileVersions = new Set(files.map((item) => item.version));

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'unavailable',
    detail: '',
    database: connectionString
      ? targetFromUrl(connectionString, source)
      : { source: 'missing', host: 'unknown', port: 'unknown', database: 'unknown' },
    runtime: {
      pgVersion: '',
      currentDatabase: '',
      serverPort: '',
    },
    summary: {
      sourceMigrationFileCount: files.length,
      schemaMigrationCount: 0,
      appliedSourceMatchCount: 0,
      sourcePendingCount: files.length,
      dbOnlyCount: 0,
      tableCount: 0,
      indexCount: 0,
    },
    recentAppliedMigrations: [],
    sourcePendingSample: files.slice(0, 50),
    dbOnlySample: [],
  };

  if (!connectionString) {
    report.detail = 'PROD_DATABASE_URL veya DATABASE_URL bulunamadı.';
    writeReport(report);
    console.log('db-prod-version-compare-report: UNAVAILABLE');
    return;
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    application_name: 'sanliurfa_db_prod_version_compare_report',
  });

  try {
    await client.connect();

    const [runtime] = await querySafe(client, `
      SELECT
        current_database() AS current_database,
        inet_server_port()::text AS server_port,
        version() AS pg_version
    `, [{}]);
    report.runtime = {
      pgVersion: runtime.pg_version || '',
      currentDatabase: runtime.current_database || '',
      serverPort: runtime.server_port || '',
    };

    const applied = await querySafe(client, `
      SELECT version, filename, executed_at
      FROM schema_migrations
      ORDER BY executed_at DESC NULLS LAST, version DESC
    `);
    const appliedVersions = new Set(applied.map((item) => item.version));
    const dbOnly = applied.filter((item) => !fileVersions.has(item.version));
    const pending = files.filter((item) => !appliedVersions.has(item.version));
    const [tableCount] = await querySafe(client, 'SELECT COUNT(*)::int AS count FROM pg_stat_user_tables', [{ count: 0 }]);
    const [indexCount] = await querySafe(client, 'SELECT COUNT(*)::int AS count FROM pg_stat_user_indexes', [{ count: 0 }]);

    report.status = 'ok';
    report.summary.schemaMigrationCount = applied.length;
    report.summary.appliedSourceMatchCount = files.length - pending.length;
    report.summary.sourcePendingCount = pending.length;
    report.summary.dbOnlyCount = dbOnly.length;
    report.summary.tableCount = Number(tableCount.count || 0);
    report.summary.indexCount = Number(indexCount.count || 0);
    report.recentAppliedMigrations = applied.slice(0, 25).map((item) => ({
      version: item.version,
      filename: item.filename,
      executedAt: item.executed_at instanceof Date ? item.executed_at.toISOString() : item.executed_at,
    }));
    report.sourcePendingSample = pending.slice(0, 50);
    report.dbOnlySample = dbOnly.slice(0, 50).map((item) => ({
      version: item.version,
      filename: item.filename,
    }));
  } catch (error) {
    report.status = 'unavailable';
    report.detail = error instanceof Error ? error.message : String(error);
  } finally {
    await client.end().catch(() => null);
  }

  writeReport(report);
  console.log(`db-prod-version-compare-report: ${report.status.toUpperCase()} (${report.summary.appliedSourceMatchCount}/${report.summary.sourceMigrationFileCount} source migrations matched)`);
}

main().catch((error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'unavailable',
    detail: error instanceof Error ? error.message : String(error),
    database: { source: 'unknown', host: 'unknown', port: 'unknown', database: 'unknown' },
    runtime: { pgVersion: '', currentDatabase: '', serverPort: '' },
    summary: {
      sourceMigrationFileCount: 0,
      schemaMigrationCount: 0,
      appliedSourceMatchCount: 0,
      sourcePendingCount: 0,
      dbOnlyCount: 0,
      tableCount: 0,
      indexCount: 0,
    },
    recentAppliedMigrations: [],
    sourcePendingSample: [],
    dbOnlySample: [],
  };
  writeReport(report);
  console.log('db-prod-version-compare-report: UNAVAILABLE');
});
