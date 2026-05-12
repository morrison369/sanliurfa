#!/usr/bin/env node
/**
 * Yeni ilçe blog yazıları için Pexels görsel çekici (sadece 5 yeni slug).
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
const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const BLOGS = [
  ['birecik-gezi-rehberi', 'euphrates river historic castle turkey scenic cliff'],
  ['viransehir-rehberi', 'anatolian steppe village turkey landscape dry grass'],
  ['bozova-ataturk-baraji-rehberi', 'dam lake reservoir turkey blue water boat'],
  ['siverek-gezi-rehberi', 'ancient castle stone hilltop turkey historic ruins'],
  ['suruc-gezi-rehberi', 'anatolian village wheat fields turkey rural landscape'],
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
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
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
  const photo = data.photos[0];
  return photo.src?.large || photo.src?.medium;
}

async function downloadImage(url) {
  const r = await fetchUrl(url);
  if (r.status !== 200) return null;
  return r.body;
}

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_API_KEY missing'); process.exit(1); }

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  console.log('SFTP connected');

  const localDir = path.join(projectRoot, 'public', 'uploads', 'blogs');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  for (const [slug, query] of BLOGS) {
    const localPath = path.join(localDir, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/public/uploads/blogs/${slug}.jpg`;

    try {
      const imgUrl = await pexelsSearch(query);
      if (!imgUrl) { console.log(`[SKIP] ${slug} — no Pexels result`); continue; }

      const imgBuf = await downloadImage(imgUrl);
      if (!imgBuf) { console.log(`[SKIP] ${slug} — download failed`); continue; }

      fs.writeFileSync(localPath, imgBuf);
      await sftp.put(localPath, remotePath);
      console.log(`[OK] ${slug}`);
      await sleep(500);
    } catch (e) {
      console.error(`[ERROR] ${slug}:`, e.message);
    }
  }

  await sftp.end();
  console.log('\nTamamlandı.');
}

main().catch(e => { console.error(e); process.exit(1); });
