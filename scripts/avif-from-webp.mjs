#!/usr/bin/env node
/**
 * AVIF from WebP — convert-uploads-webp.mjs JPG'den çalışır, fakat
 * scripts/backfill-images-pexels.mjs ile 305 yeni WebP eklendi (JPG source yok).
 * Bu script WebP'den doğrudan AVIF üretir, sharp idempotent (mevcut .avif skip).
 *
 * Browser cascade tamamlanır: AVIF > WebP > placeholder
 *
 * Kullanım:
 *   PROD=1 node scripts/avif-from-webp.mjs                # tüm dizinler
 *   PROD=1 node scripts/avif-from-webp.mjs --dir=blogs    # tek dizin
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const isProd = process.env.PROD === '1';
const PUBLIC_ROOT = isProd
  ? '/home/sanliur/public_html/public/uploads'
  : path.join(PROJECT_ROOT, 'public', 'uploads');
const DIST_ROOT = isProd
  ? '/home/sanliur/public_html/dist/client/uploads'
  : path.join(PROJECT_ROOT, 'dist', 'client', 'uploads');

const TYPES = ['places', 'historical', 'historical-sites', 'blog', 'blogs', 'events', 'avatars', 'recipes'];
const args = process.argv.slice(2);
const onlyDir = args.find(a => a.startsWith('--dir='))?.split('=')[1];

let converted = 0, skipped = 0, errors = 0, savedBytes = 0;

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function convertOne(webpPath, type) {
  const baseName = path.basename(webpPath, '.webp');
  const avifPublic = path.join(PUBLIC_ROOT, type, `${baseName}.avif`);
  const avifDist = path.join(DIST_ROOT, type, `${baseName}.avif`);

  // Idempotent: skip if both exist
  if ((await fileExists(avifPublic)) && (await fileExists(avifDist))) {
    skipped++;
    return;
  }

  const webpStat = await fs.stat(webpPath);
  // AVIF effort=4 quality=60 — build time vs quality balance
  const avifBuf = await sharp(webpPath).avif({ quality: 60, effort: 4 }).toBuffer();

  await fs.mkdir(path.join(DIST_ROOT, type), { recursive: true });
  await fs.writeFile(avifPublic, avifBuf);
  await fs.writeFile(avifDist, avifBuf);

  const saved = webpStat.size - avifBuf.length;
  savedBytes += saved;
  converted++;
  const sign = saved >= 0 ? '-' : '+';
  process.stdout.write(`  ✓ ${type}/${baseName}.avif (${(webpStat.size / 1024).toFixed(0)}KB → ${(avifBuf.length / 1024).toFixed(0)}KB, ${sign}${Math.abs(saved / 1024).toFixed(0)}KB)\n`);
}

async function processType(type) {
  const dir = path.join(PUBLIC_ROOT, type);
  if (!existsSync(dir)) return;
  const files = await fs.readdir(dir);
  const webps = files.filter(f => /\.webp$/i.test(f));
  if (webps.length === 0) return;
  console.log(`\n[${type}] ${webps.length} WebP işleniyor...`);
  for (const f of webps) {
    try {
      await convertOne(path.join(dir, f), type);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${type}/${f} — ${err.message}`);
    }
  }
}

(async () => {
  console.log(`=== AVIF from WebP ===`);
  console.log(`PUBLIC_ROOT: ${PUBLIC_ROOT}`);

  for (const t of TYPES) {
    if (onlyDir && onlyDir !== t) continue;
    await processType(t);
  }

  console.log(`\n=== ÖZET ===`);
  console.log(`  Converted: ${converted}`);
  console.log(`  Skipped:   ${skipped} (already AVIF)`);
  console.log(`  Errors:    ${errors}`);
  console.log(`  Saved:     ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });
