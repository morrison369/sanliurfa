#!/usr/bin/env node
/**
 * Blog yazıları için Pexels + Unsplash görsel çekici.
 * Kullanım: node scripts/fetch-blog-images.mjs
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

// Slug → Pexels/Unsplash arama terimi (İngilizce daha iyi sonuç verir)
const BLOGS = [
  [
    "gobeklitepe-rehberi-ziyaret-bilgileri",
    "gobekli tepe stone pillars archaeological site turkey"
  ],
  [
    "harran-konik-evleri-mimari-hikayesi",
    "harran beehive mud brick house village turkey"
  ],
  [
    "sanliurfa-muzeleri-rehberi",
    "archaeological museum ancient artifact display turkey"
  ],
  [
    "halfetide-1-gun-tekne-turu",
    "halfeti boat river turkey scenic water cliffs"
  ],
  [
    "sanliurfa-gezilecek-10-tarihi-yer",
    "historical site ancient ruins turkey landscape"
  ],
  [
    "sanliurfa-sira-gecesi-mekanlari",
    "turkish evening dinner music baglama traditional"
  ],
  [
    "cig-kofte-nasil-yapilir-sanliurfa-tarifi",
    "turkish raw meatball cig kofte street food"
  ],
  [
    "sanliurfa-en-iyi-kebapcilar",
    "turkish kebab restaurant grill meat fire"
  ],
  [
    "kunefe-nereden-yenir-sanliurfa",
    "kunefe cheese sweet pastry dessert turkish"
  ],
  [
    "bakircilar-carsisi-hediyelik-rehberi",
    "turkish copper craft bazaar market artisan"
  ],
  [
    "sanliurfada-kahvalti-7-efsane-mekan",
    "turkish breakfast table spread morning traditional"
  ],
  [
    "sanliurfa-aile-ile-gezilecek-yerler",
    "family travel turkey historic city museum"
  ],
  [
    "sanliurfa-otobus-saatleri-nasil-ogrenilir",
    "bus station terminal turkey transport travel"
  ],
  [
    "sanliurfa-festivalleri-etkinlikleri-2026",
    "cultural festival turkey music celebration crowd"
  ],
  [
    "sanliurfa-konaklama-otel-rehberi",
    "boutique hotel turkey courtyard historic building"
  ],
  [
    "sanliurfa-yaz-gezi-rehberi-2027",
    "summer travel turkey hot landscape historic"
  ],
  [
    "kasimda-sanliurfa-deneyim-artiyor-2027",
    "autumn november turkey travel tourism quiet"
  ]
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function apiGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.headers.location) {
        return apiGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('json parse')); } });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = u => {
      https.get(u, res => {
        if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(20000, function() { this.destroy(); reject(new Error('dl timeout')); });
    };
    get(url);
  });
}

async function fetchPexels(query) {
  if (!PEXELS_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await apiGet(url, { Authorization: PEXELS_KEY });
  if (!res.photos?.length) return null;
  const p = res.photos[0];
  return { url: p.src.large2x || p.src.large, source: 'pexels', id: p.id };
}

async function fetchUnsplash(query) {
  if (!UNSPLASH_KEY) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await apiGet(url, { Authorization: `Client-ID ${UNSPLASH_KEY}` });
  if (!res.results?.length) return null;
  const p = res.results[0];
  return { url: p.urls.regular, source: 'unsplash', id: p.id };
}

async function getImage(query) {
  try {
    const pexels = await fetchPexels(query);
    if (pexels) return pexels;
  } catch {}
  try {
    return await fetchUnsplash(query);
  } catch { return null; }
}

async function main() {
  if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }
  console.log(`Pexels: ${PEXELS_KEY ? '✓' : '✗'} | Unsplash: ${UNSPLASH_KEY ? '✓' : '✗'}`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const remoteUploads = `${REMOTE_DIR}/public/uploads/blogs`;
  const tmpDir = path.join(projectRoot, 'dist', '_blog_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Ensure remote dir exists
  try { await sftp.mkdir(remoteUploads, true); } catch {}

  const sqlUpdates = [];
  let done = 0, skipped = 0, failed = 0;

  for (const [slug, query] of BLOGS) {
    let exists = false;
    for (const ext of ['.jpg', '.webp', '.jpeg']) {
      try { await sftp.stat(`${remoteUploads}/${slug}${ext}`); exists = true; break; } catch {}
    }
    if (exists) {
      console.log(`  skip: ${slug}`);
      skipped++;
      continue;
    }

    try {
      const img = await getImage(query);
      if (!img) { console.log(`  no image: ${slug}`); failed++; continue; }

      const buf = await downloadBinary(img.url);
      const localPath = path.join(tmpDir, `${slug}.jpg`);
      fs.writeFileSync(localPath, buf);

      const remotePath = `${remoteUploads}/${slug}.jpg`;
      await sftp.put(localPath, remotePath);
      fs.unlinkSync(localPath);

      const dbUrl = `/uploads/blogs/${slug}.jpg`;
      sqlUpdates.push(
        `UPDATE blog_posts SET featured_image = '${dbUrl}', cover_image = '${dbUrl}' WHERE slug = '${slug}';`
      );
      console.log(`  ✓ ${slug} [${img.source}]`);
      done++;
    } catch (e) {
      console.log(`  ✗ ${slug}: ${e.message.slice(0, 60)}`);
      failed++;
    }
    await sleep(1000);
  }

  if (sqlUpdates.length > 0) {
    const sqlPath = path.join(scriptDir, 'update_blog_images.sql');
    fs.writeFileSync(sqlPath, sqlUpdates.join('\n') + '\n', 'utf8');
    console.log(`\nSQL yazıldı: ${sqlPath}`);
    console.log('Şimdi çalıştır: node scripts/prod-sync.mjs --run-sql=scripts/update_blog_images.sql');
  }

  await sftp.end();
  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  console.log(`\n✓ Tamamlandı: ${done} görsel, ${skipped} atlandı, ${failed} başarısız`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
