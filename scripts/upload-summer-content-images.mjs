#!/usr/bin/env node
/** Yaz etkinlikleri (12) + yeni blog yazıları (10) = 22 görsel */
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

const EVENTS = [
  { slug: 'gobeklitepe-arkeoloji-konferansi-2026',  query: 'archaeology conference lecture presentation academic', dir: 'events' },
  { slug: 'halfeti-gul-festivali-2026',              query: 'dark rose festival flowers garden colorful', dir: 'events' },
  { slug: 'urfa-muzik-kultur-gunleri-2026',          query: 'outdoor music concert night festival crowd', dir: 'events' },
  { slug: 'gap-turizm-fuari-2026',                   query: 'tourism fair expo exhibition hall booth', dir: 'events' },
  { slug: 'harran-yaz-okulu-2026',                   query: 'summer school students archaeology outdoor learning', dir: 'events' },
  { slug: 'balikligol-gece-bazari-2026',             query: 'night market bazaar outdoor lights colorful stalls', dir: 'events' },
  { slug: 'sanliurfa-kultur-sanat-festivali-2026',   query: 'cultural festival arts performance celebration square', dir: 'events' },
  { slug: 'uluslararasi-gastronomi-festivali-2026',  query: 'food gastronomy festival chef cooking international', dir: 'events' },
  { slug: 'fotograf-belgesel-film-gunleri-2026',     query: 'photography documentary film screening outdoor cinema', dir: 'events' },
  { slug: 'harran-antik-tiyatro-2026',               query: 'ancient theater open air performance historic ruins', dir: 'events' },
  { slug: 'sanliurfa-maratonu-2026',                 query: 'marathon runners city race street sport', dir: 'events' },
  { slug: 'gobeklitepe-gece-turu-2026',              query: 'ancient ruins night light show illumination', dir: 'events' },
];

const BLOGS = [
  { slug: 'halfeti-siyah-gulleri-dunya-tek-dogal-siyah-gul', query: 'dark black rose rare flower beautiful', dir: 'blog' },
  { slug: 'sanliurfa-bir-hafta-gezi-plani',                   query: 'travel itinerary city guide tourism landmarks', dir: 'blog' },
  { slug: 'gobeklitepeye-nasil-gidilir-ulasim-rehberi',       query: 'travel road guide journey car drive countryside', dir: 'blog' },
  { slug: 'urfa-usulu-lahmacun-pide-tarif',                   query: 'lahmacun flatbread meat turkish food', dir: 'blog' },
  { slug: 'sanliurfa-cocuklarla-gezi-aile-rehberi',           query: 'family travel children tourism sightseeing smiling', dir: 'blog' },
  { slug: 'sanliurfa-tarihi-carsilari-alisveris-rehberi',      query: 'historic bazaar covered market shopping alley', dir: 'blog' },
  { slug: 'harran-dunyanin-ilk-universite-sehrinin-hikayesi',  query: 'ancient beehive houses desert mud architecture', dir: 'blog' },
  { slug: 'sanliurfa-yaz-sicagindan-korunma-rehberi',         query: 'hot summer sun heat desert tips protection', dir: 'blog' },
  { slug: 'sanliurfa-el-sanatlari-bakir-kilim-deri',          query: 'traditional copper craft artisan bazaar handmade', dir: 'blog' },
  { slug: 'eylulde-sanliurfa-sonbahar-ziyaret-rehberi',       query: 'autumn fall travel countryside landscape nature', dir: 'blog' },
];

async function main() {
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log('SFTP bağlandı');
  let ok = 0, fail = 0;

  for (const { slug, query, dir } of [...EVENTS, ...BLOGS]) {
    const remotePub  = `${REMOTE_DIR}/public/uploads/${dir}`;
    const remoteDist = `${REMOTE_DIR}/dist/client/uploads/${dir}`;
    try { await sftp.mkdir(remotePub, true); } catch {}
    try { await sftp.mkdir(remoteDist, true); } catch {}
    try {
      process.stdout.write(`[${dir}] → ${slug}... `);
      const url = await searchImage(query, { pexelsKey: PEXELS_KEY, unsplashKey: UNSPLASH_KEY });
      if (!url) { console.log('✗ Sonuç yok'); fail++; continue; }
      const buf = await downloadImage(url);
      await sftp.put(buf, `${remotePub}/${slug}.jpg`);
      await sftp.put(buf, `${remoteDist}/${slug}.jpg`);
      console.log(`✓ (${(buf.length / 1024).toFixed(0)} KB)`);
      ok++;
      await new Promise(r => setTimeout(r, 400));
    } catch (e) { console.log(`✗ ${e.message}`); fail++; }
  }

  await sftp.end();
  console.log(`\nBitti: ${ok} yüklendi, ${fail} atlandı.`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
