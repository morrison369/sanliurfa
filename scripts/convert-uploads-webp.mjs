#!/usr/bin/env node
/**
 * /uploads/{type}/*.jpg → *.webp dönüşümü (sharp ile, idempotent).
 *
 * - JPG'leri tutar (geriye dönük uyum), yanına WebP eklerken kaynağı silmez.
 * - Mevcut .webp varsa skip eder (idempotent).
 * - public/uploads + dist/client/uploads paralel sync.
 *
 * Kullanım (prod):
 *   cd /home/sanliur/public_html && node scripts/convert-uploads-webp.mjs
 *
 * Bonus: opsiyonel `--update-db` flag → places.image_url, blog_posts.cover_image,
 * events.image_url, historical_sites.cover_image alanlarını .jpg → .webp olarak günceller.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC_ROOT = '/home/sanliur/public_html/public/uploads';
const DIST_ROOT = '/home/sanliur/public_html/dist/client/uploads';
const TYPES = ['places', 'historical', 'blog', 'events', 'avatars'];
const UPDATE_DB = process.argv.includes('--update-db');

let totalConverted = 0;
let totalSkipped = 0;
let totalErrors = 0;
let savedBytes = 0;

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function convertOne(jpgPath, type) {
  const baseName = path.basename(jpgPath, path.extname(jpgPath));
  const webpPublic = path.join(PUBLIC_ROOT, type, `${baseName}.webp`);
  const webpDist = path.join(DIST_ROOT, type, `${baseName}.webp`);

  // Skip if both already exist (idempotent)
  if ((await fileExists(webpPublic)) && (await fileExists(webpDist))) {
    totalSkipped++;
    return;
  }

  const jpgStat = await fs.stat(jpgPath);
  const buffer = await sharp(jpgPath)
    .webp({ quality: 82, effort: 5 })
    .toBuffer();

  // Ensure dirs
  await fs.mkdir(path.join(DIST_ROOT, type), { recursive: true });

  await fs.writeFile(webpPublic, buffer);
  await fs.writeFile(webpDist, buffer);

  const saved = jpgStat.size - buffer.length;
  savedBytes += saved;
  totalConverted++;
  process.stdout.write(`  ✓ ${type}/${baseName}.webp (${(jpgStat.size / 1024).toFixed(0)}KB → ${(buffer.length / 1024).toFixed(0)}KB, -${(saved / 1024).toFixed(0)}KB)\n`);
}

async function processType(type) {
  const dir = path.join(PUBLIC_ROOT, type);
  if (!(await fileExists(dir))) return;
  const files = await fs.readdir(dir);
  const jpgs = files.filter((f) => /\.(jpe?g)$/i.test(f));
  if (jpgs.length === 0) return;
  console.log(`\n[${type}] ${jpgs.length} JPG dosya işleniyor...`);
  for (const f of jpgs) {
    try {
      await convertOne(path.join(dir, f), type);
    } catch (err) {
      totalErrors++;
      console.error(`  ✗ ${type}/${f} — ${err.message}`);
    }
  }
}

async function updateDbReferences() {
  if (!UPDATE_DB) return;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const updates = [
    { table: 'app.places', col: 'image_url', sample: '/uploads/places/' },
    { table: 'app.places', col: 'thumbnail_url', sample: '/uploads/places/' },
    { table: 'app.places', col: 'cover_image', sample: '/uploads/places/' },
    { table: 'app.historical_sites', col: 'cover_image', sample: '/uploads/historical/' },
    { table: 'app.blog_posts', col: 'cover_image', sample: '/uploads/blog/' },
    { table: 'app.events', col: 'image_url', sample: '/uploads/events/' },
  ];

  console.log('\n=== DB referansları güncelleniyor (.jpg → .webp) ===');
  for (const u of updates) {
    try {
      const sql = `UPDATE ${u.table} SET ${u.col} = REPLACE(${u.col}, '.jpg', '.webp') WHERE ${u.col} LIKE $1`;
      const res = await client.query(sql, [`${u.sample}%.jpg`]);
      console.log(`  ${u.table}.${u.col}: ${res.rowCount} satır güncellendi`);
    } catch (err) {
      console.error(`  ${u.table}.${u.col}: HATA — ${err.message}`);
    }
  }

  await client.end();
}

(async () => {
  console.log('=== uploads → WebP dönüşümü başladı ===');
  for (const t of TYPES) await processType(t);
  await updateDbReferences();
  console.log('\n=== ÖZET ===');
  console.log(`  Converted: ${totalConverted}`);
  console.log(`  Skipped (already webp): ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  --update-db: ${UPDATE_DB ? 'evet' : 'hayır (sadece dosya, DB referansı güncellenmedi)'}`);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
