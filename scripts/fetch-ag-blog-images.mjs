#!/usr/bin/env node
/**
 * Session AG — eksik blog görselleri (4 eski + 4 yeni Ollama blog)
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

const PEXELS_KEY = process.env.PEXELS_KEY || process.env.PEXELS_API_KEY;
const SSH_HOST   = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT   = parseInt(process.env.SSH_PORT || '77');
const SSH_USER   = process.env.SSH_USER || 'sanliur';
const SSH_PASS   = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const BLOGS = [
  // 4 eski eksik
  ['sanliurfa-2-gunluk-gezi-rotasi',            'sanliurfa city travel itinerary stone architecture'],
  ['balikligol-ziyaret-rehberi-2026',            'sacred fish pool sanliurfa turkey historic pilgrimage'],
  ['harran-gezi-rehberi',                        'harran beehive houses ancient village mud brick turkey'],
  ['gobeklitepe-ziyaret-rehberi',               'gobekli tepe archaeological stone pillars ruins turkey'],
  // 4 yeni Ollama
  ['bozova-gezi-rehberi-ataturk-baraji-kiyisinda-doga-ve-huzur', 'ataturk dam reservoir lake fishing boat turkey nature'],
  ['akcakale-gezi-rehberi-harran-ovasinda-sinir-kasabasi',       'wheat fields plains south turkey border town harvest'],
  ['hilvan-kaplicalari-rehberi-sifali-sularla-termal-deneyim',   'thermal hot spring spa pool water healing turkey'],
  ['ceylanpinar-gezi-rehberi-tigem-ciftligi-ve-sinir-kasabasi-kulturu', 'horse farm ranch plains steppe turkey state farm'],
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
  return data.photos?.[0]?.src?.large || data.photos?.[0]?.src?.medium || null;
}

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }
  if (!SSH_PASS)   { console.error('SSH_PASS eksik');   process.exit(1); }

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log(`SFTP bağlandı\n${BLOGS.length} blog görseli çekiliyor...\n`);

  const localDir = path.join(projectRoot, 'public', 'uploads', 'blogs');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let ok = 0, skip = 0, fail = 0;

  for (const [slug, query] of BLOGS) {
    process.stdout.write(`  → ${slug.slice(0, 60)}... `);
    const localPath  = path.join(localDir, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/public/uploads/blogs/${slug}.jpg`;
    const distPath   = `${REMOTE_DIR}/dist/client/uploads/blogs/${slug}.jpg`;

    try {
      const imgUrl = await pexelsSearch(query);
      if (!imgUrl) { console.log('⊘ Pexels sonuç yok'); skip++; continue; }

      const imgBuf = await fetchUrl(imgUrl);
      if (imgBuf.status !== 200) { console.log(`⊘ indirme ${imgBuf.status}`); skip++; continue; }

      fs.writeFileSync(localPath, imgBuf.body);
      await sftp.put(localPath, remotePath);
      await sftp.put(localPath, distPath).catch(() => null);
      console.log(`✓ (${Math.round(imgBuf.body.length / 1024)}KB)`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
    await sleep(400);
  }

  await sftp.end();
  console.log(`\n✅ ${ok} ✓, ${skip} atlandı, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
