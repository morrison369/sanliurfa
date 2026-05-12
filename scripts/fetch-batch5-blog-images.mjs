#!/usr/bin/env node
/**
 * Batch 5 — 15 blog için Pexels görseli indir + SFTP ile production'a yükle.
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
  ['viransehir-gezi-rehberi-sanliurfanin-tarihi-ilcesinde-ne-yapilir', 'ancient turkish town street bazaar'],
  ['ceylanpinarda-gezilecek-yerler-sinir-sehrinin-kesfedilmemis-guzellikleri', 'steppe grassland natural landscape turkey'],
  ['akcakale-gezi-rehberi-suriye-sinirindaki-sehirde-1-gunluk-tur', 'border town middle east landscape'],
  ['birecik-te-gezilecek-yerler-kelaynak-kusu-ve-firat-kiyisinda-bir-gun', 'ibis bird river euphrates wildlife'],
  ['sanliurfa-kalesi-tarihi-kale-ve-magaralarin-tam-rehberi', 'ancient fortress castle hilltop historic'],
  ['sanliurfada-pilavclar-ve-pilav-cesitleri-yerel-pirinc-kulturu-rehberi', 'rice dish turkish food restaurant'],
  ['sanliurfa-muzleri-tam-rehberi-hangi-muzeye-gitmelisiniz', 'archaeology museum ancient artifacts mosaic'],
  ['sanliurfada-instagram-fotografciligi-en-iyi-lokasyonlar-ve-saatler', 'photography golden hour sunset turkey'],
  ['bozova-ilcesi-firat-kiyisinda-sakin-bir-tatil-alternatifi', 'dam reservoir lake euphrates nature'],
  ['sanliurfada-lahmacun-rehberi-en-iyi-lahmacun-nerede-yenir', 'lahmacun turkish flatbread food'],
  ['sanliurfada-cocuklarla-gezi-aileler-icin-en-iyi-8-aktivite', 'family children travel fun activities'],
  ['halilurahman-golu-ziyaret-rehberi-kutsal-golun-tam-anlatimi', 'sacred lake fish pool turkey'],
  ['sanliurfada-alisveris-merkezleri-ve-carsi-rehberi-nerede-ne-alinir', 'turkish bazaar market shopping covered'],
  ['sanliurfadan-diyarbakirga-gunubirlik-tur-rota-ve-pratik-bilgiler', 'diyarbakir walls historic city turkey'],
  ['sanliurfanin-tarihi-hanlari-ve-kervansaraylari-osmanli-donemi-mirasi', 'caravanserai ottoman architecture courtyard'],
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
