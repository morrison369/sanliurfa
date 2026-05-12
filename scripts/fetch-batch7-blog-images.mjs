#!/usr/bin/env node
/**
 * Batch 7 — 19 blog için Pexels görseli indir + SFTP ile production'a yükle.
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
  ['sanliurfa-ya-tek-basina-gitmek-solo-seyahat-rehberi-2026', 'solo traveler ancient city exploration backpack'],
  ['sanliurfa-dan-komsu-i-llere-gun-turu-gaziantep-mardin-diyarbakir-rotasi', 'turkish road trip scenic landscape cities'],
  ['sanliurfa-da-fotograf-rotalari-en-guzel-cekim-noktalari-ve-isik-saatleri', 'photographer golden hour sunset ancient ruins'],
  ['sanliurfa-da-butce-seyahati-dusuk-maliyetle-maksimum-kesif-rehberi', 'budget travel backpacker marketplace street'],
  ['gobeklitepe-ziyaret-rehberi-tam-kilavuz-ulasim-bilet-ve-gizem', 'gobekli tepe neolithic stone pillars archaeological'],
  ['sanliurfa-kalesi-ve-surlari-m-o-2-yuzyildan-osmanli-ya-tarihin-gozetleme-kulesi', 'ancient castle fortress citadel stone walls turkey'],
  ['neolitik-devrimin-merkezi-sanliurfa-dunya-tarihini-degistiren-kazilar', 'archaeological excavation ancient civilization dig site'],
  ['balikligol-un-4000-yillik-sirri-efsaneden-arkeolojiye-hz-i-brahim-ve-nemrut', 'sacred fish pond pool reflection mosque turkey'],
  ['sanliurfa-da-cocuklarla-yapilacaklar-aile-aktiviteleri-ve-mekanlari', 'family children park cultural museum outdoor activities'],
  ['sanliurfa-gece-rehberi-sira-gecelerinden-balikligol-de-gece-yuruyusune', 'turkish night market bazaar illuminated city lights'],
  ['sanliurfa-da-muzeler-ziyaret-rehberi-saatler-ve-oneriler', 'museum ancient artifacts exhibition historical gallery'],
  ['sanliurfa-da-alisveris-kapali-carsidan-avm-ye-nerede-ne-alinir', 'covered bazaar grand market shopping crafts copper'],
  ['hilvan-ve-bozova-kaplicalari-karsilastirmasi-sanliurfa-termal-rehberi', 'thermal hot springs spa wellness relaxation pool'],
  ['sanliurfa-da-manevi-sifa-ruhsal-yenilenme-ve-meditasyon-mekanlari', 'mosque spiritual meditation peaceful sanctuary prayer'],
  ['sanliurfa-da-organik-ve-yerel-gida-saglikli-beslenme-mekanlari-ve-pazarlar', 'organic farmers market fresh vegetables healthy food'],
  ['sanliurfa-da-aktif-turizm-hiking-bisiklet-ve-doga-yuruyusu-rotalari', 'hiking trail nature mountain bike outdoor adventure'],
  ['sanliurfa-da-hostel-ve-butce-konaklama-sirt-cantali-gezgin-rehberi', 'hostel dormitory budget travel social backpacker'],
  ['sanliurfa-da-uzun-donem-kiralik-aylik-apart-otel-ve-rezidans-rehberi', 'furnished apartment modern interior urban living'],
  ['halfeti-de-konaklama-firat-kiyisinda-butik-otel-ve-konuk-evi-secenekleri', 'halfeti turkey euphrates river village boutique scenic'],
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
}

main().catch(e => { console.error(e); process.exit(1); });
