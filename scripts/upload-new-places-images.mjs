#!/usr/bin/env node
/**
 * Yeni eklenen mekanlar için Pexels/Unsplash'tan resim indirir, prod'a yükler.
 * Konaklama (10) + Sağlık (5) + Aile&Çocuk (4) + Hizmetler (3) + Ulaşım (3)
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
if (!PEXELS_KEY && !UNSPLASH_KEY) { console.error('API key gerekli'); process.exit(1); }

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '22');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const NEW_PLACES = [
  // Konaklama
  { slug: 'grand-urfa-hotel',              query: 'luxury hotel lobby interior modern' },
  { slug: 'ramotel-sanliurfa',             query: 'hotel rooftop terrace city view' },
  { slug: 'abide-hotel-sanliurfa',         query: 'boutique hotel stone walls historic building' },
  { slug: 'balikligol-hotel',              query: 'hotel lake view tranquil water reflection' },
  { slug: 'urfa-buyuk-otel',               query: 'budget hotel clean room comfortable bed' },
  { slug: 'edessa-butik-otel',             query: 'boutique hotel courtyard stone architecture turkey' },
  { slug: 'tas-han-butik-otel',            query: 'historic caravanserai courtyard ottoman stone' },
  { slug: 'zeugma-pansiyon',               query: 'guesthouse terrace garden view village' },
  { slug: 'urfa-apart-otel',               query: 'apartment hotel room kitchen modern interior' },
  { slug: 'gobeklitepe-panorama-bungalov', query: 'wooden bungalow nature landscape sunrise hill' },
  // Sağlık
  { slug: 'sanliurfa-egitim-arastirma-hastanesi', query: 'large hospital building exterior modern' },
  { slug: 'harran-universitesi-tip-hastanesi',    query: 'university hospital medical center exterior' },
  { slug: 'ozel-sanliurfa-medikal-park',          query: 'private hospital modern clinic interior' },
  { slug: 'hilvan-ilce-devlet-hastanesi',         query: 'district hospital building entrance' },
  { slug: 'birecik-devlet-hastanesi',             query: 'hospital medical facility exterior' },
  // Aile ve Çocuk
  { slug: 'sanliurfa-hayvanat-bahcesi',      query: 'zoo animals safari nature wildlife park' },
  { slug: 'urfa-cocuk-bilim-muzesi',         query: 'children science museum interactive exhibit kids' },
  { slug: 'balikligol-mini-golf-eglence-parki', query: 'mini golf amusement park family outdoor' },
  { slug: 'harran-cocuk-kultur-merkezi',     query: 'children cultural center art class kids activities' },
  // Hizmetler ve Resmi
  { slug: 'sanliurfa-ptt-basmudurluğu',          query: 'post office building entrance mail service' },
  { slug: 'sanliurfa-buyuksehir-belediyesi-hizmet-binasi', query: 'municipal government building city hall' },
  { slug: 'sanliurfa-tursab-btu',                query: 'travel agency office tourism counter' },
  // Ulaşım
  { slug: 'sanliurfa-sehirlerarasi-otobus-terminali', query: 'bus terminal station modern building' },
  { slug: 'gap-havalimani-sanliurfa',             query: 'airport terminal interior gate departure' },
  { slug: 'sanliurfa-tcdd-gari',                  query: 'train station railway platform exterior' },
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
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
  }

  await sftp.end();
  console.log(`\nBitti: ${ok} yüklendi, ${fail} atlandı.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
