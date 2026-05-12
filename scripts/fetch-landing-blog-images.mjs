#!/usr/bin/env node
/**
 * Yeni landing sayfası blog yazıları için Pexels görsel çekici.
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
  ['harran-gezi-rehberi', 'ancient mud brick domed houses desert village turkey'],
  ['gobeklitepe-ziyaret-rehberi', 'ancient stone pillars archaeological site excavation turkey'],
  ['balikligol-ziyaret-rehberi-2026', 'sacred pond fish mosque reflection turkey'],
  ['sanliurfa-2-gunluk-gezi-rotasi', 'turkey city skyline mosque historic old town aerial'],
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
  return data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;
}

async function downloadImage(url) {
  const r = await fetchUrl(url);
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return r.body;
}

async function main() {
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const remoteUploadDir = `${REMOTE_DIR}/public/uploads/blogs`;
  try { await sftp.mkdir(remoteUploadDir, true); } catch {}

  for (const [slug, query] of BLOGS) {
    const remotePath = `${remoteUploadDir}/${slug}.jpg`;
    try {
      const existing = await sftp.exists(remotePath);
      if (existing) { console.log(`SKIP (exists): ${slug}`); continue; }

      const imgUrl = await pexelsSearch(query);
      if (!imgUrl) { console.log(`NO_IMG: ${slug} (${query})`); continue; }

      const imgBuf = await downloadImage(imgUrl);
      await sftp.put(imgBuf, remotePath);
      console.log(`OK: ${slug} (${imgBuf.length} bytes)`);
      await sleep(600);
    } catch (err) {
      console.error(`ERR: ${slug} — ${err.message}`);
    }
  }

  await sftp.end();
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
