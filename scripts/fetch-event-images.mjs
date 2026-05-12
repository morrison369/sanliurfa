#!/usr/bin/env node
/**
 * Görselsiz etkinliklere Pexels'tan kategori bazlı görsel indir.
 * Production DB'yi SSH tünel üzerinden sorgular, görsel SFTP ile yükler.
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

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
const LOCAL_TUNNEL_PORT = 15610;

if (!PEXELS_KEY) { console.error('PEXELS_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

// Kategori → Pexels arama terimleri (birden fazla → sırayla kullan)
const CATEGORY_QUERIES = {
  'Gastronomi':  ['turkish food kebab cuisine cooking', 'turkish feast meal traditional plate', 'middle east food market spices'],
  'Turizm':      ['turkey historical ruins ancient site', 'anatolia landscape ancient ruins sunrise', 'turkey travel tourism scenic view'],
  'Festival':    ['turkish cultural festival celebration outdoor', 'street festival music dance performance', 'colorful outdoor cultural event crowd'],
  'Kültür':      ['turkish cultural heritage traditional art', 'folk dance performance cultural show', 'traditional craft artisan workshop turkey'],
  'Sanat':       ['art exhibition gallery painting modern', 'photography exhibition museum contemporary', 'artist studio creative art process'],
  'Konser':      ['outdoor concert music performance night lights', 'live music stage performance crowd', 'music festival outdoor night stage'],
  'Müzik':       ['turkish music instrument oud saz', 'folk music performance traditional', 'music concert hall performance'],
  'Eğitim':      ['workshop education training hands learning', 'craft workshop art education studio', 'seminar conference learning group'],
  'Pazar':       ['traditional bazaar market colorful textiles', 'outdoor market vegetables fruit stalls', 'artisan craft market goods display'],
  'Spor':        ['outdoor sports running marathon crowd', 'sports competition athletics outdoor', 'sport event stadium crowd game'],
  'Sergi':       ['art exhibition museum gallery modern', 'exhibition display showcase indoor', 'craft fair exhibition products display'],
  'Doğa':        ['nature landscape green outdoor adventure', 'hiking trail nature forest green', 'outdoor nature park landscape turkey'],
  'Çevre':       ['environmental nature green sustainability', 'tree planting community outdoor nature', 'clean city park environment people'],
  'Gençlik':     ['youth event outdoor sports activity', 'young people group activity community', 'students activity outdoor event'],
  'Sağlık':      ['health wellness outdoor yoga meditation', 'community health sport outdoor activity', 'fitness healthy lifestyle outdoor'],
};

const DEFAULT_QUERY = 'turkey cultural event outdoor crowd';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function apiGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.headers.location)
        return apiGet(res.headers.location, headers).then(resolve).catch(reject);
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('json parse')); } });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
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

// Kategori bazlı arama — page offset ile farklı görseller
const categoryPage = {};
async function fetchPexels(category) {
  const queries = CATEGORY_QUERIES[category] || [DEFAULT_QUERY];
  categoryPage[category] = (categoryPage[category] || 0);
  const queryIdx = Math.floor(categoryPage[category] / 5) % queries.length;
  const page = (categoryPage[category] % 5) + 1;
  categoryPage[category]++;

  const query = queries[queryIdx];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&page=${page}&orientation=landscape`;
  try {
    const res = await apiGet(url, { Authorization: PEXELS_KEY });
    if (!res.photos?.length) return null;
    const p = res.photos[0];
    return { url: p.src.large2x || p.src.large, id: p.id, query };
  } catch { return null; }
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
  console.log('\n🖼️  Etkinlik görsel indirme...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  // Fetch events without images
  const { rows: events } = await db.query(
    `SELECT id, slug, title, category FROM events
     WHERE status = 'published' AND (image_url IS NULL OR image_url = '' OR image_url = '/og-image.png')
     ORDER BY start_date`
  );
  console.log(`Görselsiz etkinlik: ${events.length}\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const remoteDir = `${REMOTE_DIR}/dist/client/uploads/events`;
  const tmpDir = path.join(projectRoot, 'dist', '_evt_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Ensure remote dir exists
  try { await sftp.mkdir(remoteDir, true); } catch {}

  let done = 0, skipped = 0, failed = 0;

  for (const ev of events) {
    const remotePath = `${remoteDir}/${ev.slug}.jpg`;

    // Skip if already exists remotely
    try {
      await sftp.stat(remotePath);
      process.stdout.write(`  ⊘ mevcut: ${ev.slug.slice(0, 40)}\n`);
      skipped++;
      continue;
    } catch {}

    process.stdout.write(`  → ${ev.title.slice(0, 45).padEnd(45)}... `);

    try {
      const img = await fetchPexels(ev.category);
      if (!img) { console.log('✗ görsel yok'); failed++; continue; }

      const buf = await downloadBinary(img.url);
      const localPath = path.join(tmpDir, `${ev.slug}.jpg`);
      fs.writeFileSync(localPath, buf);
      await sftp.put(localPath, remotePath);
      fs.unlinkSync(localPath);

      const dbUrl = `/uploads/events/${ev.slug}.jpg`;
      await db.query(
        `UPDATE events SET image_url = $1 WHERE id = $2`,
        [dbUrl, ev.id]
      );
      console.log(`✓ [${img.query.slice(0, 30)}]`);
      done++;
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 50)}`);
      failed++;
    }

    await sleep(600); // Pexels rate limit
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
