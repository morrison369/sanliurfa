/**
 * Foreign Key Index Auto-Add
 *
 * PostgreSQL FK constraint'lerinde columns için index olmaması:
 *   - JOIN query'leri sequential scan zorlar
 *   - CASCADE DELETE/UPDATE'de parent table'da lock contention
 *   - PostgreSQL best practice: tüm FK columns'a index ekle
 *
 * Bu script `app` schema'sındaki tüm FK constraint'leri tarar ve eksik
 * single-column index'leri CONCURRENTLY (no-downtime) ekler.
 *
 * Kullanım:
 *   npx tsx scripts/add-fk-indexes.ts            # tümünü ekle
 *   npx tsx scripts/add-fk-indexes.ts status     # eksik listele
 *   npx tsx scripts/add-fk-indexes.ts dry-run    # ne yapacağını göster, uygulama
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep < 0) continue;
    const k = trimmed.slice(0, sep).trim();
    const v = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL env yok — .env dosyasını kontrol edin');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

let _schema: string | null = null;
async function getSchema(): Promise<string> {
  if (_schema) return _schema;
  const result = await pool.query(
    `SELECT table_schema FROM information_schema.tables WHERE table_name = 'places' LIMIT 1`,
  );
  _schema = result.rows[0]?.table_schema ?? 'public';
  return _schema;
}

async function findMissingFkIndexes(schema: string): Promise<Array<{ table: string; column: string }>> {
  const result = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT
      c.conrelid::regclass::text AS table_name,
      a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.connamespace = $1::regnamespace
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND a.attnum = ANY(i.indkey)
      )
    ORDER BY table_name, column_name`,
    [schema],
  );
  return result.rows.map((r) => {
    // table_name `app.users` formatında → sadece tablo kısmını al
    const tableName = r.table_name.includes('.') ? r.table_name.split('.').slice(1).join('.') : r.table_name;
    return { table: tableName, column: r.column_name };
  });
}

function indexName(table: string, column: string): string {
  // PostgreSQL identifier max 63 char — uzun isimleri kısalt
  const raw = `idx_fk_${table}_${column}`;
  return raw.length > 63 ? raw.substring(0, 63) : raw;
}

async function showStatus() {
  const schema = await getSchema();
  const missing = await findMissingFkIndexes(schema);
  console.log(`FK index audit — schema: ${schema}`);
  console.log('─'.repeat(80));
  console.log(`Eksik FK index sayısı: ${missing.length}\n`);
  if (missing.length === 0) {
    console.log('✓ Tüm FK kolonları indexli');
    return;
  }
  // Tabloya göre grup
  const byTable = new Map<string, string[]>();
  for (const m of missing) {
    if (!byTable.has(m.table)) byTable.set(m.table, []);
    byTable.get(m.table)!.push(m.column);
  }
  console.log(`Etkilenen tablo sayısı: ${byTable.size}\n`);
  for (const [table, cols] of byTable) {
    console.log(`  ${table}: ${cols.join(', ')}`);
  }
}

async function applyAll(dryRun: boolean = false) {
  const schema = await getSchema();
  const missing = await findMissingFkIndexes(schema);
  if (missing.length === 0) {
    console.log('✓ Eksik FK index yok');
    return;
  }
  console.log(`${missing.length} FK index ${dryRun ? 'eklenecek (DRY RUN)' : 'ekleniyor'} — schema: ${schema}\n`);

  let added = 0, skipped = 0, failed = 0;
  for (const fk of missing) {
    const name = indexName(fk.table, fk.column);
    const sql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${schema}.${fk.table} (${fk.column})`;
    if (dryRun) {
      console.log(`[DRY] ${sql}`);
      continue;
    }
    try {
      const start = Date.now();
      await pool.query(sql);
      const ms = Date.now() - start;
      console.log(`✓ ${name} (${ms}ms)`);
      added++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists')) {
        console.log(`✓ ${name} (zaten var)`);
        skipped++;
      } else {
        console.error(`✗ ${name} fail: ${msg.substring(0, 100)}`);
        failed++;
      }
    }
  }
  if (!dryRun) {
    console.log(`\nSonuç: ${added} eklendi, ${skipped} atlandı, ${failed} fail`);
  }
}

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === 'status') {
      await showStatus();
    } else if (cmd === 'dry-run') {
      await applyAll(true);
    } else {
      await applyAll(false);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
