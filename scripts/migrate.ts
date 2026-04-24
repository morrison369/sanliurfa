/**
 * Database Migration Runner
 * Runs TypeScript migrations from src/migrations/ in order
 *
 * Usage:
 *   npx tsx scripts/migrate.ts          # Run pending migrations
 *   npx tsx scripts/migrate.ts status   # Show migration status
 *   npx tsx scripts/migrate.ts down     # Rollback last migration
 */

import { readdir } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { pool } from '../src/lib/postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = resolve(__dirname, '../src/migrations');

/**
 * Ensure migration tracking table exists
 */
async function initTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      description TEXT,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/**
 * Get set of already-executed migration versions
 */
async function getExecutedVersions(): Promise<Set<string>> {
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(result.rows.map((r: any) => r.version));
}

/**
 * Discover .ts migration files, sorted by filename
 */
async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter(f => f.endsWith('.ts') && /^\d{3}_/.test(f))
    .sort();
}

/**
 * Run a single migration inside a transaction
 */
async function executeMigration(filename: string): Promise<void> {
  const version = filename.replace('.ts', '');
  const filepath = join(MIGRATIONS_DIR, filename);

  console.log(`⏳ Running: ${filename}`);

  // Dynamic import of the migration module
  const mod = await import(pathToFileURL(filepath).href);

  // Preferred shape: migration object with up()/down()
  const migrationObj = Object.values(mod).find(
    (v: any) => v && typeof v === 'object' && typeof v.up === 'function'
  ) as { version?: string; description?: string; up: (p: any) => Promise<void> } | undefined;

  // Legacy shape: file exports a direct migration function
  const upFn = Object.values(mod).find((v: any) => typeof v === 'function') as
    | ((p: any) => Promise<void>)
    | undefined;

  const runUp = migrationObj?.up || upFn;
  if (!runUp) {
    throw new Error(`No valid migration export found in ${filename}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await runUp(client);
    await client.query(
      'INSERT INTO schema_migrations (version, filename, description) VALUES ($1, $2, $3)',
      [version, filename, migrationObj?.description || '']
    );
    await client.query('COMMIT');
    console.log(`✅ Done: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting migrations...\n');

  await initTrackingTable();
  const executed = await getExecutedVersions();
  const files = await getMigrationFiles();
  const pending = files.filter(f => !executed.has(f.replace('.ts', '')));

  if (pending.length === 0) {
    console.log('✅ No pending migrations');
    return;
  }

  console.log(`📦 ${pending.length} pending migration(s)\n`);

  for (const file of pending) {
    await executeMigration(file);
  }

  console.log(`\n✅ All ${pending.length} migration(s) applied`);
}

/**
 * Show migration status
 */
async function status(): Promise<void> {
  await initTrackingTable();
  const executed = await getExecutedVersions();
  const files = await getMigrationFiles();

  console.log('\n📊 Migration Status\n');
  console.log('Filename                                    Status');
  console.log('=========================================== =========');

  for (const file of files) {
    const version = file.replace('.ts', '');
    const mark = executed.has(version) ? '✅ Applied' : '⏳ Pending';
    console.log(`${file.padEnd(43)} ${mark}`);
  }

  const pendingCount = files.filter(f => !executed.has(f.replace('.ts', ''))).length;
  console.log(`\nTotal: ${files.length} | Applied: ${executed.size} | Pending: ${pendingCount}`);
}

/**
 * Rollback last applied migration (removes tracking record only)
 */
async function rollback(): Promise<void> {
  await initTrackingTable();
  const result = await pool.query(
    'SELECT version, filename FROM schema_migrations ORDER BY executed_at DESC LIMIT 1'
  );

  if (result.rows.length === 0) {
    console.log('⚠️  No migrations to rollback');
    return;
  }

  const { version, filename } = result.rows[0];
  console.log(`⏪ Rolling back: ${filename}`);

  // Try to run down() if available
  try {
    const filepath = join(MIGRATIONS_DIR, filename);
    const mod = await import(pathToFileURL(filepath).href);
    const migration = Object.values(mod).find(
      (v: any) => v && typeof v === 'object' && typeof v.down === 'function'
    ) as { down: (p: any) => Promise<void> } | undefined;

    const rollbackFn = (Object.entries(mod).find(([key, value]) =>
      typeof value === 'function' && /^rollback_|^down$/i.test(key)
    )?.[1] || undefined) as ((p: any) => Promise<void>) | undefined;

    if (migration || rollbackFn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (migration) {
          await migration.down(client);
        } else if (rollbackFn) {
          await rollbackFn(client);
        }
        await client.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
        await client.query('COMMIT');
        console.log(`✅ Rolled back: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      await pool.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
      console.log(`⚠️  No down() found. Removed tracking record for: ${filename}`);
    }
  } catch (error) {
    console.error(`❌ Rollback failed:`, error);
  }
}

// CLI entry
const command = process.argv[2] || 'up';

(async () => {
  try {
    switch (command) {
      case 'up':
        await migrate();
        break;
      case 'down':
        await rollback();
        break;
      case 'status':
        await status();
        break;
      default:
        console.log('Usage: npx tsx scripts/migrate.ts [up|down|status]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
