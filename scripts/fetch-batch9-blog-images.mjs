#!/usr/bin/env node
/**
 * Batch 9 (Gastronomi) — 13 blog için Pexels görseli indir + SFTP.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));

const PEXELS_KEY = process.env.PEXELS_KEY;
if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// [slug, pexels_query]
const BLOGS = [
  ['sanliurfa-borek-kulturu-su-boregi-el-acmasi-ve-urfa-usulu-borekler', 'turkish borek pastry phyllo dough baked stuffed'],
  ['urfa-sillik-tatlisi-tarihi-tarifi-ve-en-iyi-tatlilar', 'turkish dessert sweet pastry walnut syrup baklava'],
  ['mirra-sanliurfanin-aci-kahvesinin-derin-kulturu', 'turkish coffee bitter dark brew traditional cup ceremony'],
  ['sanliurfa-baharat-pazari-isot-sumak-ve-yoresel-baharatlar-rehberi', 'spice market colorful spices herbs market stall'],
  ['urfa-pide-kulturu-firin-pideleri-etli-ekmek-ve-en-iyi-pideciler', 'turkish pide flatbread baked oven bread'],
  ['sanliurfada-baklava-ve-serbet-dunyasi-tatli-kulturune-yolculuk', 'baklava turkish sweet dessert honey pastry'],
  ['urfa-nin-peynir-ve-sut-urunleri-kulturu-tereyagi-yogurt-ve-lor', 'fresh cheese yogurt dairy farm traditional'],
  ['sanliurfa-pazar-yerleri-taze-sebze-meyve-ve-yerel-uretim-rehberi', 'local farmers market fresh vegetables fruit colorful'],
  ['ramazan-sofrasi-sanliurfada-iftar-gelenekleri-ve-ozel-yemekler', 'iftar ramadan dinner table food spread feast'],
  ['urfa-tatli-kulturu-kunefeden-katmere-tum-tatlilar', 'kunefe sweet cheese dessert turkey middle east'],
  ['sanliurfa-sabahlari-tereyagli-pide-kaymak-ve-geleneksel-sofra', 'turkish breakfast traditional table bread butter'],
  ['urfada-durum-ve-sandvic-kulturu-hizli-ama-lezzetli-sokak-yemekleri', 'street food wrap sandwich outdoor food stall'],
  ['sanliurfada-uzum-ve-bag-kulturu-harran-ovasinin-meyvesi', 'grape vineyard harvest wine traditional farming'],
];

const PUBLIC_DIR = path.join(projectRoot, 'public', 'uploads', 'blogs');
const DIST_DIR   = path.join(projectRoot, 'dist', 'client', 'uploads', 'blogs');
const REMOTE_DIR = '/home/sanliur/public_html/uploads/blogs';

for (const d of [PUBLIC_DIR, DIST_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  const data = await res.json();
  return data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;
}

async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log(`\n🖼️  ${BLOGS.length} gastronomi blogu için Pexels görseli indiriliyor...\n`);

  const sftp = new SftpClient();
  await sftp.connect({
    host: process.env.SSH_HOST,
    port: parseInt(process.env.SSH_PORT),
    username: process.env.SSH_USER,
    password: process.env.SSH_PASS,
  });

  try { await sftp.mkdir(REMOTE_DIR, true); } catch {}

  let ok = 0, skip = 0, fail = 0;

  for (const [slug, query] of BLOGS) {
    const localPath = path.join(PUBLIC_DIR, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/${slug}.jpg`;

    if (fs.existsSync(localPath)) {
      console.log(`  ⊘ ${slug.slice(0, 55)}.jpg — zaten var`);
      skip++;
      continue;
    }

    process.stdout.write(`  → ${slug.slice(0, 55)}... `);
    try {
      const imageUrl = await fetchPexels(query);
      if (!imageUrl) throw new Error('Sonuç yok');
      const buf = await downloadImage(imageUrl);
      fs.writeFileSync(localPath, buf);
      fs.writeFileSync(path.join(DIST_DIR, `${slug}.jpg`), buf);
      await sftp.put(localPath, remotePath);
      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }
    await sleep(500);
  }

  await sftp.end();
  console.log(`\n✅ Tamamlandı: ${ok} yeni, ${skip} zaten var, ${fail} hata`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
