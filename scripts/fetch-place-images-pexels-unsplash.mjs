#!/usr/bin/env node
/**
 * Pexels + Unsplash ile mekan görseli indir ve production'a yükle.
 * Önce Pexels'ı dener, bulamazsa Unsplash'a geçer.
 * Kullanım: node scripts/fetch-place-images-pexels-unsplash.mjs
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

// Slug → arama terimi. Pexels + Unsplash için İngilizce terim daha iyi sonuç verir.
const PLACES = [
  ['dergah-mevlid-i-halil-camii', 'historic mosque interior stone architecture'],
  ['halil-ur-rahman-camii', 'mosque reflecting pool sacred garden'],
  ['yusuf-pasa-camii', 'ottoman mosque minaret historic stone'],
  ['hz-eyup-makami-sanliurfa', 'islamic shrine interior sacred site turkey'],
  ['hz-zulkifl-turbesi', 'historic tomb shrine stone ancient'],
  ['hz-eyyub-peygamber-makami', 'religious mausoleum sacred site'],
  ['rizvaniye-medresesi', 'historic madrasa courtyard islamic architecture'],
  ['seyh-yusuf-medresesi', 'stone courtyard historic islamic building'],
  ['ipek-yolu-medresesi', 'caravanserai silk road historic stone building'],
  ['gullugoglu-baklava-pastane-sanliurfa', 'turkish baklava pistachio dessert tray'],
  ['divan-pastanesi-sanliurfa', 'turkish patisserie dessert sweets display'],
  ['ozun-pastanesi-sanliurfa', 'pastry bakery shop sweet dessert'],
  ['altin-pinar-kuyumculuk', 'gold jewelry shop display bracelet ring'],
  ['gunes-kuyumculuk-sanliurfa', 'jewelry store gold necklace counter'],
  ['dilek-kuyumculuk-sanliurfa', 'jewelry engagement ring gold display'],
  ['forum-urfa-avm', 'modern shopping mall interior bright stores'],
  ['sur-avm-sanliurfa', 'shopping center entrance stores'],
  ['karahantepe-tas-tepeler', 'archaeological site ancient excavation stone'],
  ['tas-tepeler-arkeoloji-alanlari', 'ancient ruins gobekli tepe stone pillars'],
  ['sanliurfa-belediyesi-hali-saha', 'artificial turf football pitch green sports'],
  ['karakopru-hali-saha-kompleksi', 'soccer field floodlights artificial turf night'],
  ['eyyubiye-spor-hali-saha', 'football pitch outdoor sports green turf'],
  ['halfeti-doga-bungalov-tatil-koyu', 'riverside wooden cabin bungalow nature'],
  ['bozova-baraj-golu-bungalovlari', 'lakeside cabin bungalow waterfront nature'],
  ['karacadag-yayla-bungalovlari', 'mountain highland wooden cabin nature'],
  ['mado-sanliurfa', 'ice cream shop colorful display cone scoop'],
  ['selanik-dondurma-sanliurfa', 'traditional ice cream dondurma serve'],
  ['urfa-dondurma-carsisi', 'ice cream parlor dessert shop summer'],
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
  } catch (e) { /* fallback to unsplash */ }
  try {
    return await fetchUnsplash(query);
  } catch { return null; }
}

async function main() {
  if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }
  console.log(`Pexels: ${PEXELS_KEY ? '✓' : '✗'} | Unsplash: ${UNSPLASH_KEY ? '✓' : '✗'}`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const remoteUploads = `${REMOTE_DIR}/public/uploads/places`;
  const tmpDir = path.join(projectRoot, 'dist', '_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const sqlUpdates = [];
  let done = 0, skipped = 0, failed = 0;

  for (const [slug, query] of PLACES) {
    // Check both jpg and webp
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

      const dbUrl = `/uploads/places/${slug}.jpg`;
      sqlUpdates.push(`UPDATE places SET image_url = '${dbUrl}' WHERE slug = '${slug}' AND (image_url IS NULL OR image_url = '');`);
      console.log(`  ✓ ${slug} [${img.source} #${img.id}]`);
      done++;
    } catch (e) {
      console.log(`  ✗ ${slug}: ${e.message.slice(0, 60)}`);
      failed++;
    }
    await sleep(1000); // API rate limit
  }

  // Write SQL file for prod-sync
  if (sqlUpdates.length > 0) {
    const sqlPath = path.join(scriptDir, 'update_new_place_images.sql');
    fs.writeFileSync(sqlPath, sqlUpdates.join('\n') + '\n', 'utf8');
    console.log(`\nSQL yazıldı: ${sqlPath}`);
    console.log('Şimdi çalıştır: node scripts/prod-sync.mjs --run-sql=scripts/update_new_place_images.sql');
  }

  await sftp.end();
  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  console.log(`\n✓ Tamamlandı: ${done} görsel, ${skipped} atlandı, ${failed} başarısız`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
