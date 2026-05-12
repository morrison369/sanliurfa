#!/usr/bin/env node
/** Emlak + Ev + Hukuk + İş + Medya + Otomotiv + Tarım (21 mekan) */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';
import { searchImage, downloadImage } from './image-fetcher.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(scriptDir, '.env.scripts');
function loadEnv(f) {
  if (!existsSync(f)) return;
  for (const raw of readFileSync(f, 'utf8').split(/\r?\n/)) {
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

const PLACES = [
  // Emlak
  { slug: 'remax-sanliurfa',                  query: 'real estate office modern interior business' },
  { slug: 'cengiz-emlak-sanliurfa',           query: 'real estate agency building sign turkey' },
  { slug: 'sanliurfa-osb-insaat',             query: 'construction company industrial building workers' },
  // Ev ve Yaşam
  { slug: 'urfa-nakliyat-sanliurfa',          query: 'moving truck transport boxes relocation' },
  { slug: 'sanliurfa-temizlik-hizmetleri',    query: 'professional cleaning service office team' },
  { slug: 'klima-teknik-sanliurfa',           query: 'air conditioning technician installation service' },
  // Hukuk ve Finans
  { slug: 'ziraat-bankasi-sanliurfa-merkez',  query: 'bank branch exterior modern building' },
  { slug: 'garanti-bbva-sanliurfa',           query: 'bank office interior counter service' },
  { slug: 'av-mehmet-kaya-hukuk-burosu',      query: 'law office attorney books desk professional' },
  // İş Dünyası ve Sanayi
  { slug: 'gap-organize-sanayi-bolgesi',      query: 'industrial zone factory complex aerial view' },
  { slug: 'urfa-tekstil-fabrikasi',           query: 'textile factory weaving machines production' },
  { slug: 'sanliurfa-un-fabrikasi',           query: 'flour mill wheat grain processing factory' },
  // Medya ve İletişim
  { slug: 'harran-tv-sanliurfa',              query: 'television studio news broadcast production' },
  { slug: 'sanliurfa-gazetesi',               query: 'newspaper printing press journalism office' },
  { slug: 'urfa-fm-radyosu',                  query: 'radio station studio microphone broadcasting' },
  // Otomotiv
  { slug: 'sanliurfa-toyota-galerisi',        query: 'car showroom dealership modern automobiles' },
  { slug: 'oto-ekspres-sanliurfa',            query: 'auto repair garage mechanic workshop' },
  { slug: 'lastik-dunyasi-sanliurfa',         query: 'tire shop wheel service automotive' },
  // Tarım ve Hayvancılık
  { slug: 'sanliurfa-hayvan-pazari',          query: 'livestock market cattle sheep traditional turkey' },
  { slug: 'guneydogu-veteriner-klinigi',      query: 'veterinary clinic animal care examination' },
  { slug: 'gap-tarim-urunleri-merkezi',       query: 'agricultural products market spices grains bulk' },
];

async function main() {
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log('SFTP bağlandı');
  const pub = `${REMOTE_DIR}/public/uploads/places`;
  const dist = `${REMOTE_DIR}/dist/client/uploads/places`;
  let ok = 0, fail = 0;
  for (const { slug, query } of PLACES) {
    try {
      process.stdout.write(`→ ${slug}... `);
      const url = await searchImage(query, { pexelsKey: PEXELS_KEY, unsplashKey: UNSPLASH_KEY });
      if (!url) { console.log('✗ Sonuç yok'); fail++; continue; }
      const buf = await downloadImage(url);
      await sftp.put(buf, `${pub}/${slug}.jpg`);
      await sftp.put(buf, `${dist}/${slug}.jpg`);
      console.log(`✓ (${(buf.length / 1024).toFixed(0)} KB)`);
      ok++;
      await new Promise(r => setTimeout(r, 400));
    } catch (e) { console.log(`✗ ${e.message}`); fail++; }
  }
  await sftp.end();
  console.log(`\nBitti: ${ok} yüklendi, ${fail} atlandı.`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
