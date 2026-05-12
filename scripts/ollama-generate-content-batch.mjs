#!/usr/bin/env node
/**
 * Generic Ollama Content Batch Runner
 *
 * Kullanım:
 *   node scripts/ollama-generate-content-batch.mjs <type> <count>
 *
 * Type'lar:
 *   blog          → BATCH_TOPICS_BLOG listesinden N adet blog yazısı üret
 *   recipe        → BATCH_TOPICS_RECIPE listesinden N adet tarif üret
 *   place-desc    → DB'de açıklaması ince (<200 karakter) mekanları zenginleştir
 *   event-desc    → DB'de açıklaması ince etkinlikleri zenginleştir
 *
 * Bu script Ollama Cloud API kullanır — `OLLAMA_API_KEY` env zorunlu.
 * SSH tunnel üzerinden prod PostgreSQL'e bağlanır (SSH_HOST/SSH_USER/SSH_PASS).
 *
 * Konfigürasyon: BATCH_TOPICS_* arrays — yeni konu eklemek için config'i düzenle,
 * script'i çalıştır. İçerik üretildikten sonra DB'ye INSERT/UPDATE eder.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_SEO } from './ollama-lib.mjs';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

// ─── Topic kataloğu — yeni içerik ihtiyacı için bu listeyi genişlet ──────────
const BATCH_TOPICS_BLOG = [
  { title: 'Şanlıurfa Kebap Çeşitleri: Urfa, Patlıcan ve Kaburga Rehberi', category: 'gastronomi', tags: ['kebap', 'urfa-kebabi', 'gastronomi'] },
  { title: '4 Mevsim Şanlıurfa: Hangi Ayda Nereyi Görmeli?', category: 'gezi-rehberi', tags: ['turizm', 'sezon', 'rehber'] },
  { title: "Şanlıurfa'da Ailecek Gezilecek 12 Yer", category: 'aile', tags: ['aile', 'cocuk', 'turizm'] },
  { title: 'Göbeklitepe ile Karahantepe Karşılaştırması', category: 'tarih', tags: ['gobeklitepe', 'karahantepe', 'arkeoloji'] },
  { title: 'Şanlıurfa Çarşıları: Hanlar, Kapalı Çarşı ve Hediyelik Eşyalar', category: 'alisveris', tags: ['carsi', 'alisveris', 'hediyelik'] },
  { title: "Halfeti Tekne Turu: Saatler, Ücretler ve Pratik İpuçları", category: 'gezi-rehberi', tags: ['halfeti', 'tekne', 'firat'] },
  { title: 'Sıra Gecesi Nedir, Nerede Yaşanır? Şanlıurfa Geleneği Rehberi', category: 'kultur', tags: ['sira-gecesi', 'kultur', 'muzik'] },
  { title: 'Şanlıurfa Otelleri: Bütçe, Butik ve Lüks Seçenekleri', category: 'konaklama', tags: ['otel', 'konaklama', 'pansiyon'] },
];

const BATCH_TOPICS_RECIPE = [
  { name: 'Patlıcan Kebabı', category: 'kebap', difficulty: 'orta', prep: 20, cook: 35, servings: 4 },
  { name: 'Urfa Çiğ Köfte', category: 'meze', difficulty: 'orta', prep: 30, cook: 0, servings: 6 },
  { name: 'Tirit', category: 'ana-yemek', difficulty: 'orta', prep: 15, cook: 90, servings: 5 },
  { name: 'Borani Çorbası', category: 'corba', difficulty: 'kolay', prep: 10, cook: 25, servings: 4 },
  { name: 'Şıllık Tatlısı', category: 'tatli', difficulty: 'orta', prep: 25, cook: 30, servings: 6 },
];

// ─── Args ──────────────────────────────────────────────────────────────────
const TYPE = process.argv[2] || '';
const COUNT = parseInt(process.argv[3] || '5', 10);
const VALID_TYPES = new Set(['blog', 'recipe', 'place-desc', 'event-desc']);
if (!VALID_TYPES.has(TYPE)) {
  console.error(`Kullanım: node ${path.basename(import.meta.url)} <type> <count>`);
  console.error(`  type:  blog | recipe | place-desc | event-desc`);
  console.error(`  count: kaç adet üretileceği (default 5)`);
  process.exit(1);
}

// ─── Ollama config ────────────────────────────────────────────────────────
const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;
const LOCAL_TUNNEL_PORT = 15543;
if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY env eksik'); process.exit(1); }
if (!process.env.SSH_PASS) { console.error('SSH_PASS env eksik'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer((sock) => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
          keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

// ─── Per-type generator'lar ──────────────────────────────────────────────
async function generateBlog(db, topic) {
  const prompt = `Aşağıdaki konuda 600-800 kelimelik Türkçe blog yazısı yaz. HTML formatında olmalı: <h2> ve <p> taglar. Markdown YOK. Konunun başlığı: "${topic.title}". Şanlıurfa odaklı, somut bilgiler içersin (adresler, mesafeler, fiyat aralıkları, saatler). Pazarlama jargonu kullanma; SEO uyumlu, doğal Türkçe yaz.`;
  const html = await ollamaChat([
    { role: 'system', content: SYSTEM_SEO },
    { role: 'user', content: prompt },
  ]);
  const slug = slugify(topic.title);
  const excerpt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180) + '…';
  await db.query(
    `INSERT INTO blog_posts (title, slug, content, excerpt, category, tags, status, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW(), NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [topic.title, slug, html, excerpt, topic.category, topic.tags],
  );
  console.log(`  ✓ ${topic.title} (${slug})`);
}

async function generateRecipe(db, topic) {
  const prompt = `"${topic.name}" tarifi için JSON döndür. Format: { "description": "kısa açıklama 2-3 cümle", "ingredients": ["malzeme1", ...], "instructions": ["adım1", ...] }. Türkçe, somut miktarlar ve net adımlar. Şanlıurfa mutfağına uygun.`;
  const raw = await ollamaChat([
    { role: 'system', content: 'Sadece geçerli JSON döndür, başka açıklama yazma.' },
    { role: 'user', content: prompt },
  ]);
  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    console.warn(`  ⚠ ${topic.name} — JSON parse fail, atlanıyor`);
    return;
  }
  const slug = slugify(topic.name);
  await db.query(
    `INSERT INTO recipes (name, slug, description, ingredients, instructions, category, difficulty, prep_time, cook_time, servings, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'published', NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [
      topic.name, slug, parsed.description || '',
      JSON.stringify(parsed.ingredients || []),
      JSON.stringify(parsed.instructions || []),
      topic.category, topic.difficulty, topic.prep, topic.cook, topic.servings,
    ],
  );
  console.log(`  ✓ ${topic.name} (${slug})`);
}

async function expandPlaceDesc(db) {
  const { rows } = await db.query(
    `SELECT id, name, address FROM places WHERE status='active' AND (description IS NULL OR LENGTH(description) < 200) LIMIT $1`,
    [COUNT],
  );
  console.log(`  ${rows.length} mekan için açıklama üretilecek`);
  for (const place of rows) {
    const prompt = `"${place.name}" (${place.address || 'Şanlıurfa'}) için 250-350 karakter Türkçe açıklama yaz. Mekan türü, ne sunduğu, dikkat çekici özellikleri. Pazarlama jargonu YOK.`;
    const desc = await ollamaChat([
      { role: 'system', content: SYSTEM_SEO },
      { role: 'user', content: prompt },
    ]);
    await db.query('UPDATE places SET description = $1 WHERE id = $2', [desc.trim(), place.id]);
    console.log(`  ✓ ${place.name}`);
    await sleep(2000);
  }
}

async function expandEventDesc(db) {
  const { rows } = await db.query(
    `SELECT id, title FROM events WHERE status='published' AND (description IS NULL OR LENGTH(description) < 200) LIMIT $1`,
    [COUNT],
  );
  console.log(`  ${rows.length} etkinlik için açıklama üretilecek`);
  for (const ev of rows) {
    const prompt = `"${ev.title}" etkinliği için 300-400 karakter Türkçe açıklama yaz. Ne, nerede, kime hitap ediyor.`;
    const desc = await ollamaChat([
      { role: 'system', content: SYSTEM_SEO },
      { role: 'user', content: prompt },
    ]);
    await db.query('UPDATE events SET description = $1 WHERE id = $2', [desc.trim(), ev.id]);
    console.log(`  ✓ ${ev.title}`);
    await sleep(2000);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Ollama batch: type=${TYPE} count=${COUNT} model=${MODEL}`);
  const tunnel = await openSshTunnel();
  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.PROD_DB_USER, password: process.env.PROD_DB_PASS,
    database: process.env.PROD_DB_NAME, ssl: false,
  });
  await db.connect();
  try {
    if (TYPE === 'blog') {
      for (const topic of BATCH_TOPICS_BLOG.slice(0, COUNT)) {
        try { await generateBlog(db, topic); } catch (e) { console.warn(`  ✗ ${topic.title}:`, e.message); }
        await sleep(3000);
      }
    } else if (TYPE === 'recipe') {
      for (const topic of BATCH_TOPICS_RECIPE.slice(0, COUNT)) {
        try { await generateRecipe(db, topic); } catch (e) { console.warn(`  ✗ ${topic.name}:`, e.message); }
        await sleep(3000);
      }
    } else if (TYPE === 'place-desc') {
      await expandPlaceDesc(db);
    } else if (TYPE === 'event-desc') {
      await expandEventDesc(db);
    }
  } finally {
    await db.end();
    tunnel.server.close();
    tunnel.ssh.end();
  }
  console.log('Tamamlandı.');
}

main().catch((e) => { console.error(e); process.exit(1); });
