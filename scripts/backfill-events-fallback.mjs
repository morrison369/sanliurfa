#!/usr/bin/env node
/**
 * Events fallback backfill — 71 specific festival isimleri Pexels'te yok.
 * Bu script generic "Anatolia festival" pool'undan rastgele görsel atar.
 *
 * Strateji:
 *   1. Pexels'ten 20 generic "Turkey festival" image alıp pool oluştur
 *   2. NULL image_url'lu eventler için pool'dan rastgele birini seç
 *   3. /uploads/events/{slug}.webp kaydet (her event farklı kopya, aynı imge)
 *
 * Kullanım: PROD=1 node scripts/backfill-events-fallback.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const isProd = process.env.PROD === '1';
const PUBLIC_ROOT = isProd ? '/home/sanliur/public_html/public/uploads' : path.resolve('public/uploads');
const DIST_ROOT = isProd ? '/home/sanliur/public_html/dist/client/uploads' : path.resolve('dist/client/uploads');
const ENV_PATH = isProd ? '/home/sanliur/public_html/.env' : '.env';

for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  const t = raw.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const PEXELS_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_KEY) { console.error('PEXELS_API_KEY eksik'); process.exit(1); }

function pexelsSearch(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`;
  return new Promise((resolve, reject) => {
    https.request(url, { headers: { Authorization: PEXELS_KEY } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          resolve(json.photos || []);
        } catch (e) { reject(e); }
      });
    }).on('error', reject).end();
  });
}

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = (u) => https.get(u, (res) => {
      if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
    get(url);
  });
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log('=== Events fallback backfill ===\n');

// 1. Generic festival pool oluştur (3 query × 15 result = 45 candidates)
const QUERIES = ['turkey festival celebration', 'anatolia traditional folk dance', 'middle east cultural festival'];
const candidates = [];
for (const q of QUERIES) {
  console.log(`Fetching pool for: "${q}"`);
  try {
    const photos = await pexelsSearch(q);
    candidates.push(...photos.map(p => p.src.large2x || p.src.large));
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) { console.error('Pool fetch fail:', e.message); }
}
console.log(`Pool: ${candidates.length} candidate URLs\n`);

if (candidates.length === 0) {
  console.error('No candidates. Abort.');
  process.exit(1);
}

// 2. Pre-download all to buffers (sharp encode later per event)
const pool = [];
for (let i = 0; i < Math.min(candidates.length, 10); i++) {
  try {
    const buf = await download(candidates[i]);
    pool.push(buf);
  } catch (e) { console.error(`Download fail: ${e.message}`); }
}
console.log(`Downloaded pool: ${pool.length} images\n`);

// 3. NULL events
const r = await client.query("SELECT id, slug, title FROM events WHERE image_url IS NULL AND slug IS NOT NULL ORDER BY id");
console.log(`${r.rows.length} NULL events işleniyor...\n`);

let ok = 0, fail = 0;
for (let i = 0; i < r.rows.length; i++) {
  const row = r.rows[i];
  try {
    // Rotate through pool
    const buf = pool[i % pool.length];
    const webp = await sharp(buf).resize(1200, 800, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();

    fs.mkdirSync(path.join(PUBLIC_ROOT, 'events'), { recursive: true });
    fs.mkdirSync(path.join(DIST_ROOT, 'events'), { recursive: true });
    const publicPath = path.join(PUBLIC_ROOT, 'events', `${row.slug}.webp`);
    const distPath = path.join(DIST_ROOT, 'events', `${row.slug}.webp`);
    fs.writeFileSync(publicPath, webp);
    fs.writeFileSync(distPath, webp);

    const dbUrl = `/uploads/events/${row.slug}.webp`;
    await client.query('UPDATE events SET image_url = $1 WHERE id = $2', [dbUrl, row.id]);

    ok++;
    console.log(`  ✓ ${row.slug.padEnd(50)} pool#${i % pool.length} ${(webp.length / 1024).toFixed(0)}KB`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${row.slug}: ${e.message}`);
  }
}

console.log(`\nÖzet: ${ok} OK, ${fail} fail`);
await client.end();
