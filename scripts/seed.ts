/**
 * Seed Runner — Loads SQL seed files into the database
 *
 * Usage:
 *   npx tsx scripts/seed.ts                    # Run all seed files
 *   npx tsx scripts/seed.ts 2026_guncel_mekanlar  # Run specific seed
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { pool } from '../src/lib/postgres';

const SEEDS_DIR = resolve(__dirname, '../src/db/seeds');

async function runSeedFile(filename: string): Promise<void> {
  const filepath = join(SEEDS_DIR, filename);
  const sql = await readFile(filepath, 'utf-8');

  console.log(`🌱 Seeding: ${filename}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Done: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed: ${filename}`, error instanceof Error ? error.message : error);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const specific = process.argv[2];

  if (specific) {
    const filename = specific.endsWith('.sql') ? specific : `${specific}.sql`;
    await runSeedFile(filename);
  } else {
    const files = await readdir(SEEDS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    if (sqlFiles.length === 0) {
      console.log('⚠️  No seed files found in', SEEDS_DIR);
      return;
    }

    console.log(`📦 Found ${sqlFiles.length} seed file(s)\n`);

    for (const file of sqlFiles) {
      await runSeedFile(file);
    }

    console.log(`\n✅ All ${sqlFiles.length} seed file(s) loaded`);
  }
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
