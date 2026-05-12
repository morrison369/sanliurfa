#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import SftpClient from 'ssh2-sftp-client';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

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
loadEnv(path.join(projectRoot, '.env'));

const PEXELS_KEY = process.env.PEXELS_KEY || process.env.PEXELS_API_KEY;
const LOCAL_TUNNEL_PORT = 15662;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EVENTS = [
  { slug: 'uluslararasi-gobeklitepe-festivali-2027',    query: 'ancient stone ruins festival crowd cultural archaeology' },
  { slug: 'halfeti-gece-teknesi-turu-2027',             query: 'night boat river tour romantic water reflection stars' },
  { slug: 'sanliurfa-yuzme-sampiyonasi-2027',           query: 'swimming race pool competition athlete sport summer' },
  { slug: 'yaz-geceleri-konserleri-temmuz-2027',        query: 'outdoor concert summer night audience stage music lake' },
  { slug: 'urfa-geleneksel-sporlar-festivali-2027',     query: 'traditional wrestling sport festival cultural crowd' },
  { slug: 'harran-antik-festivali-2027',                query: 'ancient ruins beehive houses festival cultural turkey' },
  { slug: 'acik-hava-sira-gecesi-agustos-2027',         query: 'traditional music night performance outdoor audience' },
  { slug: 'gobeklitepe-gece-turu-agustos-2027',         query: 'ancient stone ruins sunset night dramatic lighting archaeology' },
  { slug: 'mezopotamya-fotograf-sergisi-2027',          query: 'photo exhibition gallery art museum cultural' },
  { slug: 'uzum-hasadi-senligi-2027',                   query: 'grape harvest vineyard celebration traditional wine rural' },
  { slug: 'uluslararasi-urfa-kultur-festivali-2027',    query: 'international cultural festival dance performance crowd' },
  { slug: 'halfeti-triatlon-2027',                      query: 'triathlon river swimming cycling running race sport' },
  { slug: 'sonbahar-muzik-gunleri-2027',                query: 'autumn outdoor concert music festival historic venue' },
  { slug: 'sogmatar-antik-gece-turu-2027',              query: 'ancient ruins night starry sky astronomy archaeology' },
];

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.photos?.[0];
  return photo ? (photo.src.large2x || photo.src.large) : null;
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = u => {
      https.get(u, { headers: { 'User-Agent': 'sanliurfa-app/1.0' } }, res => {
        if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(20000, function () { this.destroy(); reject(new Error('timeout')); });
    };
    get(url);
  });
}

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }
  console.log('\n🖼️  2027 Q3 Etkinlik Görselleri (Pexels)...\n');

  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  const sftp = new SftpClient();
  await sftp.connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS });

  const remoteDir = `${process.env.REMOTE_APP_DIR || '/home/sanliur/public_html'}/public/uploads/events`;
  const tmpDir = path.join(projectRoot, 'dist', '_evq3_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  try { await sftp.mkdir(remoteDir, true); } catch {}

  let done = 0, skipped = 0, failed = 0;

  for (const e of EVENTS) {
    const remotePath = `${remoteDir}/${e.slug}.jpg`;
    try { await sftp.stat(remotePath); skipped++; process.stdout.write(`  ⊘ ${e.slug.slice(0, 42)} (var)\n`); continue; } catch {}

    process.stdout.write(`  → ${e.slug.padEnd(44)} `);
    try {
      const imgUrl = await fetchPexels(e.query);
      if (!imgUrl) { console.log('✗ bulunamadı'); failed++; await sleep(600); continue; }

      const buf = await downloadBinary(imgUrl);
      const localPath = path.join(tmpDir, `${e.slug}.jpg`);
      fs.writeFileSync(localPath, buf);
      await sftp.put(localPath, remotePath);
      fs.unlinkSync(localPath);

      await db.query(`UPDATE events SET image_url = $1 WHERE slug = $2`, [`/uploads/events/${e.slug}.jpg`, e.slug]);
      console.log('✓');
      done++;
    } catch (e2) {
      console.log(`✗ ${String(e2.message).slice(0, 40)}`);
      failed++;
    }
    await sleep(600);
  }

  await sftp.end(); await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${done} yeni | ${skipped} mevcut | ${failed} hata`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
