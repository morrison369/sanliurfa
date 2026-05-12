#!/usr/bin/env node
/**
 * Dini-Kültürel (9) + Alışveriş/Eğitim/Eğlence/Spor (19) = 28 yeni mekan resimleri
 */
import { existsSync, readFileSync } from 'node:fs';
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
if (!PEXELS_KEY && !UNSPLASH_KEY) { console.error('API key gerekli'); process.exit(1); }

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '22');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const NEW_PLACES = [
  // Dini ve Kültürel Yerler
  { slug: 'ulu-cami-rizvaniye',                query: 'historic mosque courtyard stone architecture turkey' },
  { slug: 'halilurrahman-camii',               query: 'mosque sacred fish pond turquoise water' },
  { slug: 'mevlid-i-halil-camii',              query: 'ancient mosque cave stone arches pilgrimage' },
  { slug: 'eyup-sultan-camii-sanliurfa',       query: 'Ottoman mosque dome minaret historic' },
  { slug: 'hz-ibrahim-makam-sanliurfa',        query: 'sacred site rose garden pool holy spring' },
  { slug: 'seyh-omer-turbesi',                 query: 'historic stone tomb mausoleum turkey' },
  { slug: 'mehmet-arap-medresesi',             query: 'Ottoman madrasa stone courtyard historic school' },
  { slug: 'sanliurfa-kultur-sanat-merkezi',    query: 'cultural center concert hall modern architecture' },
  { slug: 'urfa-evi-kultur-mekani',            query: 'traditional courtyard house stone architecture turkey' },
  // Alışveriş
  { slug: 'piazza-sanliurfa-avm',              query: 'shopping mall modern interior stores atrium' },
  { slug: 'sanliurfa-kapalicarsi',             query: 'covered bazaar historic market spices turkey' },
  { slug: 'bakırcilar-carsisi-sanliurfa',      query: 'copper craft bazaar artisan metalwork market' },
  { slug: 'altin-carsisi-sanliurfa',           query: 'gold jewelry market shop traditional turkey' },
  { slug: 'urfa-hal-sebze-meyve-pazari',       query: 'fresh vegetable fruit market colorful bazaar' },
  { slug: 'sanliurfa-teknoloji-carsisi',       query: 'electronics technology store market phones computers' },
  { slug: 'urfa-hali-kilim-carsisi',           query: 'traditional carpet kilim rug handmade colorful turkey' },
  // Eğitim
  { slug: 'harran-universitesi',               query: 'university campus modern buildings students' },
  { slug: 'sanliurfa-il-halk-kutuphanesi',     query: 'public library reading room books shelves' },
  { slug: 'sanliurfa-anadolu-imam-hatip-lisesi', query: 'high school education building students turkey' },
  { slug: 'harran-ingilizce-dil-kursu',        query: 'language school classroom education learning' },
  // Eğlence ve Sosyal Yaşam
  { slug: 'piazza-sinema-sanliurfa',           query: 'cinema movie theater hall seats modern' },
  { slug: 'sanliurfa-sehir-tiyatrosu',         query: 'theater stage performance arts hall' },
  { slug: 'ataturk-parki-botanik-bahcesi',     query: 'city park botanical garden lake trees family' },
  { slug: 'sira-gecesi-kultur-evi',            query: 'traditional music performance cultural evening Turkey' },
  // Spor ve Fitness
  { slug: 'sanliurfa-olimpik-yuzme-havuzu',   query: 'olympic swimming pool indoor lanes water' },
  { slug: 'mega-fitness-sanliurfa',            query: 'modern gym fitness center equipment weights' },
  { slug: 'sanliurfa-sehir-stadyumu',          query: 'football stadium grandstand field sports' },
  { slug: 'dovus-sporlari-akademisi-sanliurfa', query: 'martial arts karate training class dojo' },
];

async function main() {
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log('SFTP bağlandı');

  const remotePublicDir = `${REMOTE_DIR}/public/uploads/places`;
  const remoteDistDir   = `${REMOTE_DIR}/dist/client/uploads/places`;
  try { await sftp.mkdir(remotePublicDir, true); } catch {}
  try { await sftp.mkdir(remoteDistDir, true); } catch {}

  let ok = 0, fail = 0;

  for (const { slug, query } of NEW_PLACES) {
    try {
      process.stdout.write(`→ ${slug}... `);
      const imageUrl = await searchImage(query, { pexelsKey: PEXELS_KEY, unsplashKey: UNSPLASH_KEY });
      if (!imageUrl) { console.log('✗ Sonuç yok'); fail++; continue; }
      const imgBuffer = await downloadImage(imageUrl);
      await sftp.put(imgBuffer, `${remotePublicDir}/${slug}.jpg`);
      await sftp.put(imgBuffer, `${remoteDistDir}/${slug}.jpg`);
      console.log(`✓ (${(imgBuffer.length / 1024).toFixed(0)} KB)`);
      ok++;
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
  }

  await sftp.end();
  console.log(`\nBitti: ${ok} yüklendi, ${fail} atlandı.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
