#!/usr/bin/env node
/**
 * Ulaşım kategorisindeki mekanlar için Pexels görsel indir + SFTP + DB güncelle.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
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
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PEXELS_KEY = process.env.PEXELS_KEY;
if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }
if (!process.env.SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOCAL_TUNNEL_PORT = 15536;
const PUBLIC_DIR = path.join(projectRoot, 'public', 'uploads', 'places');
const DIST_DIR   = path.join(projectRoot, 'dist', 'client', 'uploads', 'places');
const REMOTE_DIR = '/home/sanliur/public_html/uploads/places';

const CAT_QUERIES = {
  'ulasim-taksi-duraklari': 'taxi cab yellow car street city transport',
  'ulasim-arac-kiralama': 'car rental fleet vehicles lot',
  'ulasim-transfer-firmalari': 'minivan shuttle airport transfer service',
  'ulasim-otoparklar': 'parking lot garage cars urban',
  'ulasim-otogar': 'bus station terminal transport',
  'ulasim-havalimani': 'airport terminal aviation',
  'ulasim-minibus-hatlari': 'minibus public transport city',
  'ulasim-otobus-hatlari': 'bus public transport route',
  'ulasim-tren-gari': 'train station railway terminal',
};

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
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
  console.log('\n🚕 Ulaşım mekanları için görsel indiriliyor...\n');

  for (const d of [PUBLIC_DIR, DIST_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const dbClient = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await dbClient.connect();

  const { rows: places } = await dbClient.query(`
    SELECT p.id, p.slug, p.name, c.slug AS cat_slug
    FROM places p
    JOIN categories c ON c.id = p.category_id
    WHERE c.slug LIKE 'ulasim-%' AND p.status = 'active'
    ORDER BY c.slug, p.name
  `);

  // Filter only those missing local files
  const missing = places.filter(p => {
    const localPath = path.join(PUBLIC_DIR, `${p.slug}.jpg`);
    return !fs.existsSync(localPath);
  });
  console.log(`📋 ${missing.length} ulaşım mekanı için görsel indirilecek (${places.length} toplam)\n`);

  const sftp = new SftpClient();
  await sftp.connect({
    host: process.env.SSH_HOST,
    port: parseInt(process.env.SSH_PORT),
    username: process.env.SSH_USER,
    password: process.env.SSH_PASS,
  });
  try { await sftp.mkdir(REMOTE_DIR, true); } catch {}

  let ok = 0, fail = 0;

  for (const place of missing) {
    const localPath = path.join(PUBLIC_DIR, `${place.slug}.jpg`);
    const imageUrlPath = `/uploads/places/${place.slug}.jpg`;

    process.stdout.write(`  → ${place.name.slice(0, 50)}... `);

    const query = CAT_QUERIES[place.cat_slug] || 'transport service turkey';
    try {
      const imageUrl = await fetchPexels(query);
      if (!imageUrl) throw new Error('Pexels sonuç yok');
      const buf = await downloadImage(imageUrl);
      fs.writeFileSync(localPath, buf);
      fs.writeFileSync(path.join(DIST_DIR, `${place.slug}.jpg`), buf);
      await sftp.put(localPath, `${REMOTE_DIR}/${place.slug}.jpg`);
      await dbClient.query('UPDATE places SET image_url=$1 WHERE id=$2', [imageUrlPath, place.id]);
      console.log(`✓`);
      ok++;
      await sleep(500);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(300);
    }
  }

  await sftp.end();
  await dbClient.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} görsel, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
