#!/usr/bin/env node
/**
 * Yeme-İçme mekanları için Pexels'ten resim indirir, SFTP ile prod'a yükler.
 * Çıktı: scripts/update-food-thumbnails.sql
 * Sonra: node scripts/prod-sync.mjs --run-sql=scripts/update-food-thumbnails.sql
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';
import { searchImage, downloadImage } from './image-fetcher.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(scriptDir, '.env.scripts');

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(envFile);

const PEXELS_KEY = process.env.PEXELS_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_KEY;
if (!PEXELS_KEY && !UNSPLASH_KEY) { console.error('PEXELS_KEY veya UNSPLASH_KEY gerekli'); process.exit(1); }

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '22');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const FOOD_PLACES = [
  { slug: 'oz-urfa-lahmacuncusu',    query: 'lahmacun turkish flatbread pizza' },
  { slug: 'haci-mehmet-lahmacun',    query: 'lahmacun turkish food dough' },
  { slug: 'selahattin-usta-kunefe',  query: 'kunefe turkish cheese dessert sweet' },
  { slug: 'balikligol-kunefecisi',   query: 'kunefe turkish dessert pastry cheese' },
  { slug: 'harran-cay-bahcesi',      query: 'turkish tea garden outdoor cafe' },
  { slug: 'gobeklitepe-cafe',        query: 'modern coffee shop cafe filter coffee' },
  { slug: 'urfa-pastanesi',          query: 'turkish baklava pastry sweets shop' },
  { slug: 'usta-katmercisi',         query: 'turkish flatbread katmer cheese pastry' },
  { slug: 'meshur-urfa-katmeri',     query: 'turkish breakfast flatbread pastry' },
  { slug: 'mirra-evi',               query: 'turkish coffee traditional cup small' },
  { slug: 'dicle-et-lokantasi',      query: 'turkish grilled meat kebab restaurant' },
  { slug: 'antep-usulu-dondurma',    query: 'turkish ice cream dondurma stretch' },
];


async function main() {
  const sftp = new SftpClient();
  await sftp.connect({
    host: SSH_HOST,
    port: SSH_PORT,
    username: SSH_USER,
    password: SSH_PASS,
  });
  console.log('SFTP bağlandı');

  const remoteUploadsDir = `${REMOTE_DIR}/public/uploads/places`;
  const remoteDistDir    = `${REMOTE_DIR}/dist/client/uploads/places`;

  // Her iki dizini de oluştur (varsa sorun değil)
  try { await sftp.mkdir(remoteUploadsDir, true); } catch {}
  try { await sftp.mkdir(remoteDistDir, true); } catch {}

  const sqlUpdates = [];
  let ok = 0, fail = 0;

  for (const { slug, query } of FOOD_PLACES) {
    try {
      console.log(`→ ${slug}...`);

      const imageUrl = await searchImage(query, { pexelsKey: PEXELS_KEY, unsplashKey: UNSPLASH_KEY });
      if (!imageUrl) { console.log(`  ✗ Sonuç yok`); fail++; continue; }

      const imgBuffer = await downloadImage(imageUrl);

      // public/ ve dist/client/ her ikisine yükle
      await sftp.put(imgBuffer, `${remoteUploadsDir}/${slug}.jpg`);
      await sftp.put(imgBuffer, `${remoteDistDir}/${slug}.jpg`);
      console.log(`  ✓ yüklendi (${(imgBuffer.length / 1024).toFixed(0)} KB)`);

      sqlUpdates.push({ slug, localPath: `/uploads/places/${slug}.jpg` });
      ok++;

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
      fail++;
    }
  }

  await sftp.end();
  console.log(`\nSFTP kapatıldı. ${ok} yüklendi, ${fail} atlandı.`);

  if (sqlUpdates.length > 0) {
    const lines = sqlUpdates.map(({ slug, localPath }) =>
      `UPDATE places SET thumbnail_url = '${localPath}' WHERE slug = '${slug}';`
    );
    lines.push(
      `SELECT slug, thumbnail_url FROM places WHERE slug IN (${sqlUpdates.map(u => `'${u.slug}'`).join(',')});`
    );
    const outFile = resolve(scriptDir, 'update-food-thumbnails.sql');
    writeFileSync(outFile, lines.join('\n') + '\n');
    console.log(`\nSQL → ${outFile}`);
    console.log('Şimdi çalıştır:');
    console.log('  node scripts/prod-sync.mjs --run-sql=scripts/update-food-thumbnails.sql');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
