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
const LOCAL_TUNNEL_PORT = 15676;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RECIPES = [
  { slug: 'ciger-kavurma',            query: 'lamb liver sauteed spicy pan turkish traditional' },
  { slug: 'nohutlu-bulgur-pilavi',     query: 'bulgur wheat pilaf chickpeas traditional turkish side dish' },
  { slug: 'misket-kofte',              query: 'small meatballs turkish traditional lamb spiced plate' },
  { slug: 'patlican-mucver',           query: 'eggplant fritters turkish fried vegetable meze plate' },
  { slug: 'urfa-soguk-ayva-tatlisi',   query: 'quince dessert sweet cold turkish traditional fruit' },
  { slug: 'urfa-tas-firin-ekmegi',     query: 'stone oven bread rustic turkish artisan baked traditional' },
  { slug: 'urfa-domates-corbasi',      query: 'tomato soup turkish traditional bowl warm spicy' },
  { slug: 'kavurga',                   query: 'roasted wheat grain turkish traditional snack cereal' },
  { slug: 'urfa-peynirli-gozleme',     query: 'flatbread cheese filled gozleme turkish pancake griddle' },
  { slug: 'keledos',                   query: 'small dumplings manti turkish traditional handmade rustic' },
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
  console.log('\n🍽️  Batch 10 Tarif Görselleri (Pexels)...\n');

  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  const sftp = new SftpClient();
  await sftp.connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS });

  const remoteDir = `${process.env.REMOTE_APP_DIR || '/home/sanliur/public_html'}/public/uploads/recipes`;
  const tmpDir = path.join(projectRoot, 'dist', '_recipe10_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  try { await sftp.mkdir(remoteDir, true); } catch {}

  let done = 0, skipped = 0, failed = 0;

  for (const r of RECIPES) {
    const remotePath = `${remoteDir}/${r.slug}.jpg`;
    try { await sftp.stat(remotePath); skipped++; process.stdout.write(`  ⊘ ${r.slug} (var)\n`); continue; } catch {}

    process.stdout.write(`  → ${r.slug.padEnd(30)} `);
    try {
      const imgUrl = await fetchPexels(r.query);
      if (!imgUrl) { console.log('✗ bulunamadı'); failed++; await sleep(600); continue; }

      const buf = await downloadBinary(imgUrl);
      const localPath = path.join(tmpDir, `${r.slug}.jpg`);
      fs.writeFileSync(localPath, buf);
      await sftp.put(localPath, remotePath);
      fs.unlinkSync(localPath);

      await db.query(`UPDATE recipes SET cover_image = $1 WHERE slug = $2`, [`/uploads/recipes/${r.slug}.jpg`, r.slug]);
      console.log('✓');
      done++;
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 40)}`);
      failed++;
    }
    await sleep(600);
  }

  await sftp.end(); await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${done} yeni | ${skipped} mevcut | ${failed} hata`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
