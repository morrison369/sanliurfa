#!/usr/bin/env node
/**
 * Batch 6 — 15 blog için Pexels görseli indir + SFTP ile production'a yükle.
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
  ['siverek-ilce-rehberi-sanliurfanin-en-buyuk-ilcesinde-gezi-ve-yasam', 'turkish town market street bazaar'],
  ['suruc-gezi-rehberi-tarih-ve-topragi-sehrinde-yapilacaklar', 'ancient walls ruins archaeological site'],
  ['hilvan-ilcesi-ataturk-baraji-golu-kiyisinda-doga-ve-dinginlik', 'dam lake reservoir nature peaceful'],
  ['harran-kumbet-evleri-dunyanin-hicbir-yerinde-olmayan-mimari-mucize', 'beehive houses dome mud architecture harran'],
  ['sanliurfada-balik-restoranlari-ve-firat-lezzetleri-rehberi', 'grilled fish restaurant river euphrates'],
  ['sanliurfada-kahvalti-kulturu-en-iyi-8-kahvalti-mekani', 'turkish breakfast spread table food'],
  ['sanliurfada-spor-ve-aktif-yasam-kosu-yuruyus-ve-fitness-rehberi', 'running jogging park outdoor fitness'],
  ['balikligol-cevresi-yuruyus-rotalari-tarihi-atmosferde-adim-adim', 'sacred fish pool turkey walking path'],
  ['hz-ibrahimin-izinde-sanliurfanin-dini-ziyaret-noktalari-rehberi', 'mosque domed architecture turkey pilgrimage'],
  ['sanliurfada-konak-ve-butik-oteller-tarihi-atmosferde-konaklama', 'boutique hotel stone courtyard historic'],
  ['sanliurfada-dugun-gelenegiii-kina-gecesi-mehter-ve-toy-rituelleri', 'turkish wedding celebration traditional folk'],
  ['karakopru-ilce-rehberi-sanliurfanin-modern-yuzu', 'modern turkish neighborhood urban residential'],
  ['sanliurfada-carsi-kulturu-kapali-carsi-ve-bedesten-tarihi', 'covered bazaar market historic trading'],
  ['gobeklitenin-yakinindaki-koyler-orencikte-yerel-hayat', 'rural village countryside turkey traditional'],
  ['sanliurfada-sanat-yerel-sanatcilar-galeriler-ve-el-sanatlari', 'traditional crafts artisan copper metalwork'],
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
  console.log(`\n🖼️  ${BLOGS.length} blog için Pexels görseli indiriliyor...\n`);

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
      console.log(`  ⊘ ${slug.slice(0,55)}.jpg — zaten var`);
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
}

main().catch(e => { console.error(e); process.exit(1); });
