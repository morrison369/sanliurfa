#!/usr/bin/env node
/**
 * /public/images/ altındaki tüm JPG/PNG'leri WebP + AVIF'e çevirir.
 *
 * /uploads/ için convert-uploads-webp.mjs vardı, bu /public/images/ için.
 * Hero images, blog thumbnails, food cards — bu dosyalar performance kritik.
 *
 * Sharp: WebP q82, AVIF q60 effort=4. Idempotent (mevcut .webp/.avif skip).
 *
 * Kullanım:
 *   node scripts/convert-public-images.mjs        # local + dist
 *   PROD=1 node scripts/convert-public-images.mjs # prod paths
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const isProd = process.env.PROD === '1';
const PUBLIC_ROOT = isProd
  ? '/home/sanliur/public_html/public/images'
  : path.join(PROJECT_ROOT, 'public', 'images');
const DIST_ROOT = isProd
  ? '/home/sanliur/public_html/dist/client/images'
  : path.join(PROJECT_ROOT, 'dist', 'client', 'images');

let webpConverted = 0, avifConverted = 0, skipped = 0, errors = 0;
let savedWebpBytes = 0, savedAvifBytes = 0;

async function fileExists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function processFile(fullPath, relPath) {
  const dir = path.dirname(relPath);
  const ext = path.extname(relPath).toLowerCase();
  const base = path.basename(relPath, ext);

  const webpPub = path.join(PUBLIC_ROOT, dir, `${base}.webp`);
  const webpDist = path.join(DIST_ROOT, dir, `${base}.webp`);
  const avifPub = path.join(PUBLIC_ROOT, dir, `${base}.avif`);
  const avifDist = path.join(DIST_ROOT, dir, `${base}.avif`);

  const needWebp = !(await fileExists(webpPub)) || !(await fileExists(webpDist));
  const needAvif = !(await fileExists(avifPub)) || !(await fileExists(avifDist));

  if (!needWebp && !needAvif) { skipped++; return; }

  const stat = await fs.stat(fullPath);
  await fs.mkdir(path.join(PUBLIC_ROOT, dir), { recursive: true });
  await fs.mkdir(path.join(DIST_ROOT, dir), { recursive: true });

  const parts = [];

  if (needWebp) {
    const buf = await sharp(fullPath).webp({ quality: 82, effort: 5 }).toBuffer();
    await fs.writeFile(webpPub, buf);
    await fs.writeFile(webpDist, buf);
    const saved = stat.size - buf.length;
    savedWebpBytes += saved;
    webpConverted++;
    parts.push(`webp ${(buf.length / 1024).toFixed(0)}KB (-${(saved / 1024).toFixed(0)}KB)`);
  }
  if (needAvif) {
    const buf = await sharp(fullPath).avif({ quality: 60, effort: 4 }).toBuffer();
    await fs.writeFile(avifPub, buf);
    await fs.writeFile(avifDist, buf);
    const saved = stat.size - buf.length;
    savedAvifBytes += saved;
    avifConverted++;
    parts.push(`avif ${(buf.length / 1024).toFixed(0)}KB (-${(saved / 1024).toFixed(0)}KB)`);
  }

  console.log(`  ✓ ${relPath}  ${parts.join(', ')}`);
}

async function walk(dir, prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) await walk(full, rel);
    else if (/\.(jpe?g|png)$/i.test(e.name)) {
      try { await processFile(full, rel); }
      catch (err) { errors++; console.error(`  ✗ ${rel}: ${err.message}`); }
    }
  }
}

(async () => {
  console.log(`=== /public/images convert ===\nPUBLIC: ${PUBLIC_ROOT}\nDIST:   ${DIST_ROOT}\n`);
  if (!existsSync(PUBLIC_ROOT)) {
    console.error('PUBLIC_ROOT yok:', PUBLIC_ROOT);
    process.exit(1);
  }
  await walk(PUBLIC_ROOT);
  console.log(`\n=== ÖZET ===`);
  console.log(`  WebP converted: ${webpConverted}  saved=${(savedWebpBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  AVIF converted: ${avifConverted}  saved=${(savedAvifBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Skipped:        ${skipped}`);
  console.log(`  Errors:         ${errors}`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
