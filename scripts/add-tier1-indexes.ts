/**
 * Tier 1 Critical Indexes — DB-INDEX-AUDIT.md
 *
 * Production'da no-downtime apply için CONCURRENTLY kullanılır. CONCURRENTLY
 * transaction içinde ÇALIŞMAZ — bu yüzden bu script standalone, idempotent
 * çalışır (migration runner BEGIN/COMMIT wrap'ından uzak).
 *
 * Standalone pg client kullanır (lib/postgres.ts wrapper'a bağımlı değil) — env
 * yükleme zamanlaması sorunsuz çalışır.
 *
 * Kullanım:
 *   npx tsx scripts/add-tier1-indexes.ts        # tüm 5 indexi ekle
 *   npx tsx scripts/add-tier1-indexes.ts status # mevcut durum
 *
 * Beklenen etki: 40-60% filtre query speedup (places/reviews/comments/users/blog_posts)
 * Storage: ~450 MB toplam (5 index)
 * Süre: tablo boyutuna göre 1-15dk (CONCURRENTLY background)
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

interface IndexSpec {
  name: string;
  table: string;
  sql: string;
  description: string;
}

const TIER1_INDEXES: IndexSpec[] = [
  {
    name: 'idx_places_owner_id_status',
    table: 'places',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_owner_id_status ON places (owner_id, status)',
    description: 'Vendor dashboard ownership check (47 usages)',
  },
  {
    name: 'idx_reviews_place_id_status',
    table: 'reviews',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_place_id_status ON reviews (place_id, status)',
    description: 'Place detail approved reviews (38 usages)',
  },
  {
    name: 'idx_comments_entity_status',
    table: 'comments',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_entity_status ON comments (target_type, target_id, status)',
    description: 'Comment thread by entity (29 usages)',
  },
  {
    name: 'idx_users_email_verified_created',
    table: 'users',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified_created ON users (email_verified, created_at DESC)',
    description: 'Admin verification dashboard (22 usages)',
  },
  {
    name: 'idx_blogs_author_status_published',
    table: 'blog_posts',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_author_status_published ON blog_posts (author_id, status, published_at DESC)',
    description: 'Author archive chronological (16 usages)',
  },
];

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// Detected schema (production: 'app', dev: 'public') — current_schema() ile resolve
let _schema: string | null = null;
async function getSchema(): Promise<string> {
  if (_schema) return _schema;
  // Tablonun bulunduğu schema'yı tespit et (places her ortamda var)
  const result = await pool.query(
    `SELECT table_schema FROM information_schema.tables WHERE table_name = 'places' LIMIT 1`,
  );
  _schema = result.rows[0]?.table_schema ?? 'public';
  return _schema;
}

async function tableExists(table: string): Promise<boolean> {
  const schema = await getSchema();
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
    [schema, table],
  );
  return Boolean(result.rows[0]?.exists);
}

async function indexExists(name: string): Promise<boolean> {
  const schema = await getSchema();
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = $1 AND indexname = $2)`,
    [schema, name],
  );
  return Boolean(result.rows[0]?.exists);
}

async function indexSize(name: string): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT pg_size_pretty(pg_relation_size(quote_ident($1)::regclass)) AS size`,
      [name],
    );
    return result.rows[0]?.size ?? '?';
  } catch {
    return '?';
  }
}

async function showStatus() {
  console.log('Tier 1 indexes durumu:');
  console.log('─'.repeat(80));
  for (const idx of TIER1_INDEXES) {
    const tbl = await tableExists(idx.table);
    if (!tbl) {
      console.log(`  ⚠ ${idx.name} — table "${idx.table}" YOK`);
      continue;
    }
    const exists = await indexExists(idx.name);
    if (exists) {
      const sz = await indexSize(idx.name);
      console.log(`  ✓ ${idx.name} (${sz})`);
    } else {
      console.log(`  ✗ ${idx.name} — eksik (${idx.description})`);
    }
  }
}

async function applyAll() {
  const schema = await getSchema();
  console.log(`Tier 1 critical indexes uygulanıyor (schema: ${schema}, CONCURRENTLY — no-downtime)...\n`);
  for (const idx of TIER1_INDEXES) {
    const tbl = await tableExists(idx.table);
    if (!tbl) {
      console.log(`⚠ ${idx.name} — table "${schema}.${idx.table}" yok, atlanıyor`);
      continue;
    }
    if (await indexExists(idx.name)) {
      console.log(`✓ ${idx.name} zaten var, atlanıyor`);
      continue;
    }
    // Schema-qualified table name
    const schemaQualifiedSql = idx.sql.replace(` ON ${idx.table} `, ` ON ${schema}.${idx.table} `);
    const start = Date.now();
    try {
      await pool.query(schemaQualifiedSql);
      const ms = Date.now() - start;
      const sz = await indexSize(idx.name);
      console.log(`✓ ${idx.name} eklendi (${ms}ms, ${sz})`);
    } catch (err) {
      console.error(`✗ ${idx.name} fail:`, err instanceof Error ? err.message : err);
    }
  }
  console.log('\nFinal durum:');
  await showStatus();
}

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === 'status') {
      await showStatus();
    } else {
      await applyAll();
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
