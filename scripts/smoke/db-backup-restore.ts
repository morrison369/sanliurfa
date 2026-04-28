import { query, pool } from '../../src/lib/postgres';

async function main() {
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
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
