#!/usr/bin/env node
/**
 * /uploads/{type}/*.jpg → *.webp + *.avif dönüşümü (sharp ile, idempotent).
 *
 * Karar: hem WebP hem AVIF üret — modern browser AVIF (~%20 daha küçük), fallback WebP.
 * <picture> markup'ı sırasıyla AVIF→WebP→JPG dener.
 *
 * - JPG'leri tutar (geriye dönük uyum), yanına WebP+AVIF ekler.
 * - Mevcut .webp+.avif varsa skip eder (idempotent).
 * - public/uploads + dist/client/uploads paralel sync.
 *
 * Kullanım:
 *   node scripts/convert-uploads-webp.mjs                    # local dev (sadece public/uploads)
 *   node scripts/convert-uploads-webp.mjs --update-db        # DB referansları da güncelle
 *   PROD=1 node scripts/convert-uploads-webp.mjs             # prod path
 *   node scripts/convert-uploads-webp.mjs --skip-avif        # sadece WebP (eski davranış)
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Path resolution: PROD=1 → prod paths, else local relative
const isProd = process.env.PROD === '1';
const PUBLIC_ROOT = isProd
  ? '/home/sanliur/public_html/public/uploads'
  : path.join(PROJECT_ROOT, 'public', 'uploads');
const DIST_ROOT = isProd
  ? '/home/sanliur/public_html/dist/client/uploads'
  : path.join(PROJECT_ROOT, 'dist', 'client', 'uploads');

// All actual upload subdirectories — `blogs` ve `recipes` legacy script'te eksikti
const TYPES = ['places', 'historical', 'historical-sites', 'blog', 'blogs', 'events', 'avatars', 'recipes'];
const UPDATE_DB = process.argv.includes('--update-db');
const SKIP_AVIF = process.argv.includes('--skip-avif');

let totalConverted = { webp: 0, avif: 0 };
let totalSkipped = 0;
let totalErrors = 0;
let savedBytes = { webp: 0, avif: 0 };

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
  const avifPublic = path.join(PUBLIC_ROOT, type, `${baseName}.avif`);
  const avifDist = path.join(DIST_ROOT, type, `${baseName}.avif`);

  const webpNeeded = !((await fileExists(webpPublic)) && (await fileExists(webpDist)));
  const avifNeeded = !SKIP_AVIF && !((await fileExists(avifPublic)) && (await fileExists(avifDist)));

  if (!webpNeeded && !avifNeeded) {
    totalSkipped++;
    return;
  }

  const jpgStat = await fs.stat(jpgPath);
  await fs.mkdir(path.join(PUBLIC_ROOT, type), { recursive: true });
  await fs.mkdir(path.join(DIST_ROOT, type), { recursive: true });

  const parts = [];

  if (webpNeeded) {
    const webpBuf = await sharp(jpgPath).webp({ quality: 82, effort: 5 }).toBuffer();
    await fs.writeFile(webpPublic, webpBuf);
    await fs.writeFile(webpDist, webpBuf);
    const saved = jpgStat.size - webpBuf.length;
    savedBytes.webp += saved;
    totalConverted.webp++;
    parts.push(`webp ${(webpBuf.length / 1024).toFixed(0)}KB (-${(saved / 1024).toFixed(0)}KB)`);
  }

  if (avifNeeded) {
    // AVIF effort 4: build time/quality balance — effort 9 çok yavaş, 4 ~80% gain
    const avifBuf = await sharp(jpgPath).avif({ quality: 60, effort: 4 }).toBuffer();
    await fs.writeFile(avifPublic, avifBuf);
    await fs.writeFile(avifDist, avifBuf);
    const saved = jpgStat.size - avifBuf.length;
    savedBytes.avif += saved;
    totalConverted.avif++;
    parts.push(`avif ${(avifBuf.length / 1024).toFixed(0)}KB (-${(saved / 1024).toFixed(0)}KB)`);
  }

  process.stdout.write(`  ✓ ${type}/${baseName} → ${parts.join(', ')}\n`);
}

async function processType(type) {
  const dir = path.join(PUBLIC_ROOT, type);
  if (!existsSync(dir)) return;
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

  // .env'i manuel yükle — prod cron'ları DATABASE_URL'i env'de buluyor olabilir
  // ama node script'i SSH üzerinden çalıştırılınca .env yüklenmiyor.
  if (!process.env.DATABASE_URL) {
    const envCandidates = isProd
      ? ['/home/sanliur/public_html/.env']
      : [path.join(PROJECT_ROOT, '.env'), path.join(PROJECT_ROOT, '.env.local')];
    for (const envPath of envCandidates) {
      if (!existsSync(envPath)) continue;
      const lines = (await fs.readFile(envPath, 'utf8')).split(/\r?\n/);
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx < 0) continue;
        const k = t.slice(0, idx).trim();
        let v = t.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) process.env[k] = v;
      }
      break;
    }
  }

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Sadece WebP'ye yönlendir; AVIF'i <picture> markup'ında source olarak ekleyeceğiz,
  // DB tek path tutar. WebP fallback olarak yeterli (browser desteği %96+).
  const updates = [
    { table: 'places', col: 'image_url', sample: '/uploads/places/' },
    { table: 'places', col: 'thumbnail_url', sample: '/uploads/places/' },
    { table: 'historical_sites', col: 'cover_image', sample: '/uploads/historical/' },
    { table: 'historical_sites', col: 'cover_image', sample: '/uploads/historical-sites/' },
    { table: 'blog_posts', col: 'cover_image', sample: '/uploads/blog/' },
    { table: 'blog_posts', col: 'cover_image', sample: '/uploads/blogs/' },
    { table: 'events', col: 'image_url', sample: '/uploads/events/' },
    { table: 'recipes', col: 'cover_image', sample: '/uploads/recipes/' },
  ];

  console.log('\n=== DB referansları güncelleniyor (.jpg → .webp) ===');
  for (const u of updates) {
    try {
      const sql = `UPDATE ${u.table} SET ${u.col} = REPLACE(${u.col}, '.jpg', '.webp') WHERE ${u.col} LIKE $1`;
      const res = await client.query(sql, [`${u.sample}%.jpg`]);
      console.log(`  ${u.table}.${u.col} (${u.sample}): ${res.rowCount} satır güncellendi`);
    } catch (err) {
      console.error(`  ${u.table}.${u.col}: HATA — ${err.message}`);
    }
  }

  await client.end();
}

(async () => {
  console.log('=== uploads → WebP' + (SKIP_AVIF ? '' : ' + AVIF') + ' dönüşümü başladı ===');
  console.log(`PUBLIC_ROOT: ${PUBLIC_ROOT}`);
  console.log(`DIST_ROOT:   ${DIST_ROOT}`);
  for (const t of TYPES) await processType(t);
  await updateDbReferences();
  console.log('\n=== ÖZET ===');
  console.log(`  WebP converted: ${totalConverted.webp}  (saved ${(savedBytes.webp / 1024 / 1024).toFixed(2)} MB)`);
  if (!SKIP_AVIF) {
    console.log(`  AVIF converted: ${totalConverted.avif}  (saved ${(savedBytes.avif / 1024 / 1024).toFixed(2)} MB)`);
  }
  console.log(`  Skipped (already converted): ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  --update-db: ${UPDATE_DB ? 'evet' : 'hayır (sadece dosya)'}`);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
