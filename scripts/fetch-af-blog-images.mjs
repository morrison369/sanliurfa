#!/usr/bin/env node
/**
 * Session AF — 15 yeni blog yazısı için Pexels görsel çekici.
 * Kullanım: node scripts/fetch-af-blog-images.mjs
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const SSH_HOST   = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT   = parseInt(process.env.SSH_PORT || '77');
const SSH_USER   = process.env.SSH_USER || 'sanliur';
const SSH_PASS   = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const BLOGS = [
  ['siverek-gezi-rehberi-tarihi-ve-dogal-guzellikler',              'ancient castle hilltop turkey stone ruins landscape'],
  ['birecik-gezi-rehberi-firat-kiyisinda-essiz-bir-ilce',           'euphrates river valley scenic cliff turkey'],
  ['viransehir-gezi-rehberi-tarih-ve-kultur',                       'anatolian town historic mosque turkey sunny'],
  ['suruc-gezi-rehberi-tarihi-dokunuslar-ve-yerel-lezzetler',       'turkey rural village bazaar ancient walls'],
  ['halfetide-konaklama-en-iyi-butik-oteller-ve-konuk-evleri',      'boutique hotel river view cozy accommodation turkey'],
  ['sanliurfada-kahvalti-nerede-yapilir-en-iyi-10-kahvalti-mekani', 'turkish breakfast spread food table honey cream'],
  ['sanliurfa-baklavacilar-rehberi-en-iyi-baklava-ve-tatli-mekanlari', 'baklava turkish sweets pistachio pastry dessert'],
  ['urfa-ciger-kebabi-en-iyi-cigerciler-ve-siparis-rehberi',        'grilled liver kebab turkish street food skewer'],
  ['karakopru-rehberi-sanliurfanin-modern-ilcesinde-neler-yapilir', 'modern turkish city cafe street urban district'],
  ['haliliye-ilce-rehberi-sanliurfa-merkezinin-kalbi',              'sanliurfa city bazaar historic architecture stone'],
  ['harranda-konaklama-kumbet-evler-ve-antik-atmosferde-gece',      'harran beehive houses mud brick ancient village night'],
  ['sanliurfa-sira-gecesi-gelenek-muzik-ve-lezzet-rehberi',         'turkish traditional music dinner evening gathering'],
  ['gobeklitepe-ziyaret-rehberi-biletler-saatler-ve-pratik-bilgiler-2026', 'gobekli tepe archaeological site stone pillars excavation'],
  ['sanliurfada-cocuklarla-gezilecek-yerler-aile-dostu-aktiviteler','family children outdoor turkey park adventure'],
  ['balikligol-ve-cevresindeki-en-iyi-kafeler-guzel-manzarali-oturma-noktalari', 'lake view cafe terrace outdoor scenic sitting'],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

async function pexelsSearch(query) {
  if (!PEXELS_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const r = await fetchUrl(url, { Authorization: PEXELS_KEY });
  if (r.status !== 200) return null;
  const data = JSON.parse(r.body.toString());
  if (!data.photos?.length) return null;
  return data.photos[0].src?.large || data.photos[0].src?.medium;
}

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_API_KEY eksik'); process.exit(1); }
  if (!SSH_PASS)   { console.error('SSH_PASS eksik');       process.exit(1); }

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log('SFTP bağlandı\n');

  const localDir = path.join(projectRoot, 'public', 'uploads', 'blogs');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let ok = 0, skip = 0, fail = 0;

  for (const [slug, query] of BLOGS) {
    process.stdout.write(`  → ${slug.slice(0, 55)}... `);
    const localPath  = path.join(localDir, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/public/uploads/blogs/${slug}.jpg`;

    try {
      const imgUrl = await pexelsSearch(query);
      if (!imgUrl) { console.log('⊘ Pexels sonuç yok'); skip++; continue; }

      const imgBuf = await fetchUrl(imgUrl);
      if (imgBuf.status !== 200) { console.log(`⊘ indirme ${imgBuf.status}`); skip++; continue; }

      fs.writeFileSync(localPath, imgBuf.body);

      // Local → production SFTP
      await sftp.put(localPath, remotePath);

      // Also put to dist/client for immediate serving
      const distPath = `${REMOTE_DIR}/dist/client/uploads/blogs/${slug}.jpg`;
      await sftp.put(localPath, distPath).catch(() => null);

      console.log('✓');
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
    await sleep(400);
  }

  await sftp.end();
  console.log(`\n✅ Tamamlandı: ${ok} ✓, ${skip} atlandı, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
