import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  const candidates = [
    path.join(ROOT, '.env.production'),
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
  ];
  for (const candidate of candidates) loadEnvFile(candidate);
}

async function main() {
  loadRuntimeEnv();
  const { query, pool } = await import('../../src/lib/postgres');

  console.log('db backup/restore smoke');
  await query(`CREATE TABLE IF NOT EXISTS smoke_backup_restore (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const marker = `smoke-${Date.now()}`;
  await query('INSERT INTO smoke_backup_restore (marker) VALUES ($1)', [marker]);
  const before = await query<{ c: number }>(
    'SELECT COUNT(*)::int AS c FROM smoke_backup_restore WHERE marker = $1',
    [marker],
  );
  if (!before.rows[0]?.c) throw new Error('backup smoke insert not visible');

  await query('CREATE TEMP TABLE tmp_backup AS SELECT * FROM smoke_backup_restore WHERE marker = $1', [marker]);
  await query(`INSERT INTO smoke_backup_restore (marker)
               SELECT marker || '-restored' FROM tmp_backup`);

  const restored = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM smoke_backup_restore WHERE marker = $1`,
    [`${marker}-restored`],
  );
  if (!restored.rows[0]?.c) throw new Error('restore simulation failed');

  await query('DELETE FROM smoke_backup_restore WHERE marker = $1 OR marker = $2', [
    marker,
    `${marker}-restored`,
  ]);
  console.log('OK: db backup/restore smoke passed');

  await pool.end();
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
