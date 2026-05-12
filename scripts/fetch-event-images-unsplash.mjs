#!/usr/bin/env node
/**
 * Görselsiz etkinliklere Unsplash'tan kategori bazlı görsel indir.
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');
const SftpClient = require('ssh2-sftp-client');

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

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
const LOCAL_TUNNEL_PORT = 15618;

if (!UNSPLASH_KEY) { console.error('UNSPLASH_ACCESS_KEY eksik'); process.exit(1); }

const CATEGORY_QUERIES = {
  'Gastronomi':  'turkish food kebab cuisine traditional plate',
  'Turizm':      'turkey historical ruins ancient site landscape',
  'Festival':    'cultural festival celebration outdoor crowd',
  'Kültür':      'turkish cultural heritage traditional art folk',
  'Sanat':       'art exhibition gallery painting contemporary',
  'Konser':      'outdoor concert music performance night stage',
  'Müzik':       'music concert live performance crowd stage',
  'Eğitim':      'workshop education training studio learning',
  'Pazar':       'traditional bazaar market colorful textiles',
  'Spor':        'outdoor sports running marathon athletics',
  'Sergi':       'exhibition museum gallery display showcase',
  'Doğa':        'nature landscape hiking outdoor adventure green',
  'Çevre':       'environmental nature green sustainability outdoor',
  'Gençlik':     'youth outdoor sports activity community',
  'Sağlık':      'health wellness yoga outdoor fitness',
};

const DEFAULT_QUERY = 'turkey cultural event outdoor celebration';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchUnsplash(category) {
  const query = CATEGORY_QUERIES[category] || DEFAULT_QUERY;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${UNSPLASH_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const imgUrl = data.urls?.regular || data.urls?.full;
    if (!imgUrl) return null;
    return { url: imgUrl, id: data.id, query };
  } catch { return null; }
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = u => {
      https.get(u, res => {
        if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(20000, function () { this.destroy(); reject(new Error('dl timeout')); });
    };
    get(url);
  });
}

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
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n🖼️  Etkinlik görsel indirme (Unsplash)...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  const { rows: events } = await db.query(
    `SELECT id, slug, title, category FROM events
     WHERE status = 'published' AND (image_url IS NULL OR image_url = '')
     ORDER BY start_date`
  );
  console.log(`Görselsiz etkinlik: ${events.length}\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const remoteDir = `${REMOTE_DIR}/public/uploads/events`;
  const tmpDir = path.join(projectRoot, 'dist', '_evt_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  try { await sftp.mkdir(remoteDir, true); } catch {}

  let done = 0, skipped = 0, failed = 0;

  for (const ev of events) {
    const remotePath = `${remoteDir}/${ev.slug}.jpg`;

    try {
      await sftp.stat(remotePath);
      skipped++;
      continue;
    } catch {}

    process.stdout.write(`  → ${ev.title.slice(0, 45).padEnd(45)}... `);

    try {
      const img = await fetchUnsplash(ev.category);
      if (!img) { console.log('✗ görsel yok'); failed++; continue; }

      const buf = await downloadBinary(img.url);
      const localPath = path.join(tmpDir, `${ev.slug}.jpg`);
      fs.writeFileSync(localPath, buf);
      await sftp.put(localPath, remotePath);
      fs.unlinkSync(localPath);

      const dbUrl = `/uploads/events/${ev.slug}.jpg`;
      await db.query(`UPDATE events SET image_url = $1 WHERE id = $2`, [dbUrl, ev.id]);
      console.log(`✓ [${img.query.slice(0, 30)}]`);
      done++;
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 50)}`);
      failed++;
    }

    await sleep(800); // Unsplash rate limit: 50 req/hr demo
  }

  const { rows: [stats] } = await db.query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') AS with_img
     FROM events WHERE status = 'published'`
  );

  await sftp.end();
  await db.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${done} yeni | ${skipped} mevcut | ${failed} hata`);
  console.log(`📊 Etkinlik toplam: ${stats.total} | Görselli: ${stats.with_img}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
