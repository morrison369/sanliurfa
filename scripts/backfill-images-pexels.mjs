#!/usr/bin/env node
/**
 * Pexels backfill — NULL cover_image / image_url ref'lerini doldurur.
 *
 * Bağlam: 2026-05-13 cleanup-broken-image-refs.cjs ile 801 broken ref NULL'a
 * çevrildi. Bu script Pexels API ile ilgili görselleri çeker, sharp ile WebP'ye
 * çevirir, public/uploads/{type}/{slug}.webp olarak kaydeder, DB'yi günceller.
 *
 * Targets (places HARİÇ — stock photos misleading for SMB):
 *   - blog_posts.cover_image
 *   - events.image_url
 *   - recipes.cover_image
 *   - historical_sites.cover_image
 *
 * Rate limit: 4.5s/request (~800/hour, Pexels free tier 200/hr safe)
 *
 * Kullanım (prod):
 *   PROD=1 node scripts/backfill-images-pexels.mjs --batch=50
 *   PROD=1 node scripts/backfill-images-pexels.mjs --table=blog_posts --batch=20
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const isProd = process.env.PROD === '1';
const PUBLIC_ROOT = isProd ? '/home/sanliur/public_html/public/uploads' : path.resolve('public/uploads');
const DIST_ROOT = isProd ? '/home/sanliur/public_html/dist/client/uploads' : path.resolve('dist/client/uploads');
const ENV_PATH = isProd ? '/home/sanliur/public_html/.env' : '.env';

// Load .env
if (fs.existsSync(ENV_PATH)) {
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
}

const PEXELS_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_KEY) {
  console.error('PEXELS_API_KEY eksik');
  process.exit(1);
}

const args = process.argv.slice(2);
const onlyTable = args.find(a => a.startsWith('--table='))?.split('=')[1];
const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '50', 10);
const RATE_MS = 4500; // 4.5s between requests

const TABLES = [
  { table: 'blog_posts',       col: 'cover_image', dir: 'blogs',            queryFrom: 'title' },
  { table: 'historical_sites', col: 'cover_image', dir: 'historical-sites', queryFrom: 'name+keyword:historic landmark' },
  { table: 'recipes',          col: 'cover_image', dir: 'recipes',          queryFrom: 'name+keyword:food cuisine' },
  { table: 'events',           col: 'image_url',   dir: 'events',           queryFrom: 'title+keyword:festival event celebration' },
];

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

function pexelsSearch(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers: { Authorization: PEXELS_KEY } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          if (json.photos?.length) resolve({ url: json.photos[0].src.large2x || json.photos[0].src.large, id: json.photos[0].id });
          else resolve(null);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('pexels timeout')); });
    req.end();
  });
}

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = (u) => https.get(u, (res) => {
      if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).setTimeout(20000, function() { this.destroy(); reject(new Error('download timeout')); });
    get(url);
  });
}

function buildQuery(row, recipe) {
  const titleField = recipe.queryFrom.startsWith('title') ? row.title : row.name;
  if (!titleField) return null;
  // Strip prefix like "şanlıurfa", "urfa" for cleaner search (Pexels has weak Turkish geo)
  const cleaned = titleField.replace(/\b(şanlıurfa|urfa|sanlıurfa|sanliurfa)\b/gi, '').trim();
  const keyword = recipe.queryFrom.includes('keyword:') ? ' ' + recipe.queryFrom.split('keyword:')[1] : '';
  return (cleaned || titleField) + keyword;
}

async function processRow(row, recipe) {
  const query = buildQuery(row, recipe);
  if (!query) return { skipped: true, reason: 'no title/name' };

  // Pexels search
  let img;
  try { img = await pexelsSearch(query); }
  catch (e) { return { error: 'pexels: ' + e.message }; }
  if (!img) return { skipped: true, reason: 'no pexels result for "' + query.slice(0, 40) + '"' };

  // Download
  let buf;
  try { buf = await download(img.url); }
  catch (e) { return { error: 'download: ' + e.message }; }

  // WebP convert
  const webpBuf = await sharp(buf).resize(1200, 800, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();

  // Save
  const publicDir = path.join(PUBLIC_ROOT, recipe.dir);
  const distDir = path.join(DIST_ROOT, recipe.dir);
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });
  const fileName = `${row.slug}.webp`;
  const publicPath = path.join(publicDir, fileName);
  const distPath = path.join(distDir, fileName);
  fs.writeFileSync(publicPath, webpBuf);
  fs.writeFileSync(distPath, webpBuf);

  // Update DB
  const dbUrl = `/uploads/${recipe.dir}/${fileName}`;
  await client.query(`UPDATE ${recipe.table} SET ${recipe.col} = $1 WHERE id = $2`, [dbUrl, row.id]);

  return { ok: true, query, size: Math.round(webpBuf.length / 1024) + 'KB' };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log(`\n📸 Pexels Backfill — batch=${batchSize}${onlyTable ? ' table=' + onlyTable : ''}\n`);
  console.log(`PUBLIC_ROOT: ${PUBLIC_ROOT}`);
  console.log(`Rate limit: ${RATE_MS}ms (~${Math.round(3600000 / RATE_MS)}/hr)\n`);

  let total = { processed: 0, ok: 0, skipped: 0, errors: 0 };

  for (const recipe of TABLES) {
    if (onlyTable && onlyTable !== recipe.table) continue;
    const titleField = recipe.queryFrom.startsWith('title') ? 'title' : 'name';
    const sql = `SELECT id, slug, ${titleField} FROM ${recipe.table} WHERE ${recipe.col} IS NULL AND slug IS NOT NULL ORDER BY id LIMIT $1`;
    const r = await client.query(sql, [batchSize]);
    if (r.rows.length === 0) {
      console.log(`[${recipe.table}] 0 NULL ref — skip`);
      continue;
    }
    console.log(`[${recipe.table}] ${r.rows.length} NULL ref işleniyor...`);

    for (const row of r.rows) {
      total.processed++;
      const res = await processRow(row, recipe);
      if (res.ok) {
        total.ok++;
        console.log(`  ✓ ${row.slug.padEnd(50)} ${res.size}  q="${res.query.slice(0, 30)}"`);
      } else if (res.skipped) {
        total.skipped++;
        console.log(`  ⊘ ${row.slug.padEnd(50)} ${res.reason}`);
      } else {
        total.errors++;
        console.log(`  ✗ ${row.slug.padEnd(50)} ${res.error}`);
      }
      await sleep(RATE_MS);
    }
  }

  console.log(`\n=== ÖZET ===`);
  console.log(`  Processed: ${total.processed}`);
  console.log(`  OK:        ${total.ok}`);
  console.log(`  Skipped:   ${total.skipped}`);
  console.log(`  Errors:    ${total.errors}`);

  await client.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
