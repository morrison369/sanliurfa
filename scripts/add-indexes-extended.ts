/**
 * Tier 2 + Tier 3 Indexes — DB-INDEX-AUDIT.md
 *
 * Tier 1 (5 index) için: scripts/add-tier1-indexes.ts
 * Bu script Tier 2 (5 index) + Tier 3 (8 index) ekler.
 *
 * Tier 2 — 50-100 usage (reviews_user_created, favorites, subscriptions, notifications, activity)
 * Tier 3 — 20-50 usage (points, contact, newsletter, events, collections, messages, webhooks, coupons)
 *
 * Standalone, idempotent, CONCURRENTLY. Schema-aware (production: 'app', dev: 'public').
 *
 * Kullanım:
 *   npx tsx scripts/add-indexes-extended.ts        # tüm 13 index
 *   npx tsx scripts/add-indexes-extended.ts status # mevcut durum
 *   npx tsx scripts/add-indexes-extended.ts tier2  # sadece Tier 2 (5 index)
 *   npx tsx scripts/add-indexes-extended.ts tier3  # sadece Tier 3 (8 index)
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
  columns: string;
  description: string;
  tier: 2 | 3;
}

const INDEXES: IndexSpec[] = [
  // Tier 2 — 50-100 usage
  { name: 'idx_reviews_user_created', table: 'reviews', columns: '(user_id, created_at DESC)', description: 'User review history', tier: 2 },
  { name: 'idx_favorites_user_created', table: 'favorites', columns: '(user_id, created_at DESC)', description: 'User favorites listing', tier: 2 },
  { name: 'idx_subscriptions_user_status_billing', table: 'subscriptions', columns: '(user_id, status, next_billing_date)', description: 'Active subscriptions + billing', tier: 2 },
  { name: 'idx_notifications_user_unread_created', table: 'notifications', columns: '(user_id, is_read, created_at DESC)', description: 'Unread notifications inbox', tier: 2 },
  { name: 'idx_activity_summaries_user_date', table: 'activity_summaries', columns: '(user_id, date DESC)', description: 'User activity timeline', tier: 2 },

  // Tier 3 — 20-50 usage
  { name: 'idx_points_transactions_user_created', table: 'points_transactions', columns: '(user_id, created_at DESC)', description: 'Loyalty points history', tier: 3 },
  { name: 'idx_contact_messages_status_created', table: 'contact_messages', columns: '(status, created_at DESC)', description: 'Admin contact inbox', tier: 3 },
  { name: 'idx_newsletter_status_subscribed', table: 'newsletter_subscribers', columns: '(status, subscribed_at DESC)', description: 'Newsletter management', tier: 3 },
  { name: 'idx_event_attendees_event_user', table: 'event_attendees', columns: '(event_id, user_id)', description: 'RSVP lookup', tier: 3 },
  { name: 'idx_collections_user_public_created', table: 'collections', columns: '(user_id, is_public, created_at DESC)', description: 'User collections', tier: 3 },
  // messages: conversation-based modeling — recipient_id yok, conversation_id var
  { name: 'idx_messages_conversation_unread_created', table: 'messages', columns: '(conversation_id, is_read, created_at DESC)', description: 'Conversation thread unread messages', tier: 3 },
  { name: 'idx_webhooks_status_created', table: 'webhooks', columns: '(status, created_at DESC)', description: 'Webhook management', tier: 3 },
  // coupons: kolon adı 'active' (is_active değil)
  { name: 'idx_coupons_code_active_valid', table: 'coupons', columns: '(code, active, valid_until DESC)', description: 'Coupon validation', tier: 3 },
];

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
    const schema = await getSchema();
    const result = await pool.query(
      `SELECT pg_size_pretty(pg_relation_size((quote_ident($1) || '.' || quote_ident($2))::regclass)) AS size`,
      [schema, name],
    );
    return result.rows[0]?.size ?? '?';
  } catch {
    return '?';
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const schema = await getSchema();
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3)`,
    [schema, table, column],
  );
  return Boolean(result.rows[0]?.exists);
}

async function verifyColumns(idx: IndexSpec): Promise<{ ok: boolean; missing: string[] }> {
  const matches = idx.columns.match(/[a-z_]+/g) ?? [];
  // SQL keyword'leri filtrele
  const sqlKeywords = new Set(['desc', 'asc']);
  const cols = matches.filter((c) => !sqlKeywords.has(c.toLowerCase()));
  const missing: string[] = [];
  for (const c of cols) {
    if (!(await columnExists(idx.table, c))) missing.push(c);
  }
  return { ok: missing.length === 0, missing };
}

async function showStatus(filter?: 2 | 3) {
  const items = filter ? INDEXES.filter((i) => i.tier === filter) : INDEXES;
  console.log(`Extended indexes durumu${filter ? ` (Tier ${filter})` : ''}:`);
  console.log('─'.repeat(80));
  for (const idx of items) {
    const tbl = await tableExists(idx.table);
    if (!tbl) {
      console.log(`  ⚠ T${idx.tier} ${idx.name} — table "${idx.table}" YOK`);
      continue;
    }
    const exists = await indexExists(idx.name);
    if (exists) {
      const sz = await indexSize(idx.name);
      console.log(`  ✓ T${idx.tier} ${idx.name} (${sz})`);
    } else {
      console.log(`  ✗ T${idx.tier} ${idx.name} — eksik (${idx.description})`);
    }
  }
}

async function applyAll(filter?: 2 | 3) {
  const schema = await getSchema();
  const items = filter ? INDEXES.filter((i) => i.tier === filter) : INDEXES;
  console.log(`Extended indexes uygulanıyor${filter ? ` (Tier ${filter})` : ''} — schema: ${schema}\n`);
  let added = 0, skipped = 0, failed = 0;
  for (const idx of items) {
    const tbl = await tableExists(idx.table);
    if (!tbl) {
      console.log(`⚠ ${idx.name} — table "${idx.table}" yok, atlanıyor`);
      skipped++;
      continue;
    }
    if (await indexExists(idx.name)) {
      console.log(`✓ ${idx.name} zaten var`);
      skipped++;
      continue;
    }
    // Sütun doğrulaması — bazı tablolar audit'tekiyle farklı kolon adı kullanabilir
    const check = await verifyColumns(idx);
    if (!check.ok) {
      console.log(`⚠ ${idx.name} — eksik kolon(lar): ${check.missing.join(', ')} — atlanıyor`);
      skipped++;
      continue;
    }
    const sql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${idx.name} ON ${schema}.${idx.table} ${idx.columns}`;
    const start = Date.now();
    try {
      await pool.query(sql);
      const ms = Date.now() - start;
      const sz = await indexSize(idx.name);
      console.log(`✓ ${idx.name} eklendi (${ms}ms, ${sz})`);
      added++;
    } catch (err) {
      console.error(`✗ ${idx.name} fail:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }
  console.log(`\nSonuç: ${added} eklendi, ${skipped} atlandı, ${failed} fail`);
}

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === 'status') {
      await showStatus();
    } else if (cmd === 'tier2') {
      await applyAll(2);
    } else if (cmd === 'tier3') {
      await applyAll(3);
    } else {
      await applyAll();
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
