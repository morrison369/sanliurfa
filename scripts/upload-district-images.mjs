#!/usr/bin/env node
/**
 * İlçe mekanları için Pexels'ten resim indirir, hem public/ hem dist/client/ altına yükler.
 * Çıktı: scripts/update-district-thumbnails.sql
 * Sonra: node scripts/prod-sync.mjs --run-sql=scripts/update-district-thumbnails.sql
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

const DISTRICT_PLACES = [
  { slug: 'birecik-kalesi',                query: 'ancient stone castle ruins turkey' },
  { slug: 'birecik-kelaynak-gozlem-alani', query: 'bald ibis bird nature wildlife' },
  { slug: 'firat-kiyisi-lokantasi-birecik',query: 'riverside restaurant turkish food' },
  { slug: 'bozova-kalesi',                 query: 'hilltop castle ruins ancient turkey' },
  { slug: 'ataturk-baraji-seyir-noktasi',  query: 'large dam reservoir lake turkey landscape' },
  { slug: 'ceylanpinar-tarim-isletmesi',   query: 'wheat fields farm agricultural landscape' },
  { slug: 'ceylanpinar-sehir-parki',       query: 'city park trees walkway green' },
  { slug: 'hilvan-kaplicalari',            query: 'thermal hot spring pool outdoor spa' },
  { slug: 'hilvan-merkez-camii',           query: 'mosque minaret turkey architecture' },
  { slug: 'suruc-kalesi',                  query: 'stone castle ruins ancient anatolian' },
  { slug: 'suruc-eyup-sultan-camii',       query: 'historic mosque courtyard architecture' },
  { slug: 'suruc-sehir-lokantasi',         query: 'traditional turkish local restaurant' },
  { slug: 'viransehir-antik-kenti',        query: 'roman ruins archaeological site ancient' },
  { slug: 'hz-zulkuf-turbesi-viransehir',  query: 'ottoman mausoleum shrine dome turkey' },
  { slug: 'serinnaz-havuzu-viransehir',    query: 'outdoor swimming pool summer water' },
  { slug: 'rumkale-halfeti',              query: 'castle cliff river canyon turkey' },
  { slug: 'halfeti-tekne-turu',           query: 'boat tour river scenic water green' },
  { slug: 'halfeti-misafirhanesi',        query: 'boutique guesthouse river view accommodation' },
  { slug: 'harran-konik-evleri-muzesi',   query: 'harran beehive houses ancient mud brick' },
  { slug: 'harran-han-restoran',          query: 'stone building courtyard restaurant turkey' },
];

async function main() {
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log('SFTP bağlandı');

  const remotePublicDir = `${REMOTE_DIR}/public/uploads/places`;
  const remoteDistDir   = `${REMOTE_DIR}/dist/client/uploads/places`;

  try { await sftp.mkdir(remotePublicDir, true); } catch {}
  try { await sftp.mkdir(remoteDistDir, true); } catch {}

  const sqlUpdates = [];
  let ok = 0, fail = 0;

  for (const { slug, query } of DISTRICT_PLACES) {
    try {
      process.stdout.write(`→ ${slug}... `);

      const imageUrl = await searchImage(query, { pexelsKey: PEXELS_KEY, unsplashKey: UNSPLASH_KEY });
      if (!imageUrl) { console.log('✗ Sonuç yok'); fail++; continue; }

      const imgBuffer = await downloadImage(imageUrl);

      await sftp.put(imgBuffer, `${remotePublicDir}/${slug}.jpg`);
      await sftp.put(imgBuffer, `${remoteDistDir}/${slug}.jpg`);
      console.log(`✓ (${(imgBuffer.length / 1024).toFixed(0)} KB)`);

      sqlUpdates.push({ slug, localPath: `/uploads/places/${slug}.jpg` });
      ok++;

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`✗ ${e.message}`);
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
      `SELECT slug, thumbnail_url FROM places WHERE slug IN (${sqlUpdates.map(u => `'${u.slug}'`).join(',')}) ORDER BY slug;`
    );
    const outFile = resolve(scriptDir, 'update-district-thumbnails.sql');
    writeFileSync(outFile, lines.join('\n') + '\n');
    console.log(`\nSQL → ${outFile}`);
    console.log('Şimdi çalıştır:');
    console.log('  node scripts/prod-sync.mjs --run-sql=scripts/update-district-thumbnails.sql');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
