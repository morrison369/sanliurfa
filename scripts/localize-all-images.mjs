#!/usr/bin/env node
/**
 * Veritabanındaki TÜM harici görsel URL'lerini (Pexels/Unsplash/HTTP)
 * lokalे public/uploads/ dizinine indirir, SFTP ile production'a yükler,
 * DB'yi local path ile günceller.
 *
 * Kapsam: events.image_url, recipes.cover_image, places.thumbnail_url
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

const LOCAL_TUNNEL_PORT = 15580;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DIRS = {
  events:  { local: path.join(projectRoot, 'public', 'uploads', 'events'),  remote: '/home/sanliur/public_html/uploads/events' },
  recipes: { local: path.join(projectRoot, 'public', 'uploads', 'recipes'), remote: '/home/sanliur/public_html/uploads/recipes' },
  places:  { local: path.join(projectRoot, 'public', 'uploads', 'places'),  remote: '/home/sanliur/public_html/uploads/places' },
};

for (const { local } of Object.values(DIRS)) {
  fs.mkdirSync(local, { recursive: true });
  const dist = local.replace(
    path.join(projectRoot, 'public'),
    path.join(projectRoot, 'dist', 'client')
  );
  fs.mkdirSync(dist, { recursive: true });
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
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function downloadImage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sanliurfa.com image localizer)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

function isExternal(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

function localPath(type, slug, ext = 'jpg') {
  return `/uploads/${type}/${slug}.${ext}`;
}

async function processType(type, rows, pool, sftp, stats) {
  const { local, remote } = DIRS[type];

  try { await sftp.mkdir(remote, true); } catch {}

  for (const row of rows) {
    const slug = row.slug || String(row.id);
    const filename = `${slug}.jpg`;
    const localFile = path.join(local, filename);
    const distFile = localFile.replace(
      path.join(projectRoot, 'public'),
      path.join(projectRoot, 'dist', 'client')
    );
    const remotePath = `${remote}/${filename}`;
    const newDbPath = localPath(type, slug);

    process.stdout.write(`  [${type}] ${slug.slice(0, 50)} ... `);

    if (fs.existsSync(localFile)) {
      // Dosya var, sadece DB'yi güncelle
      try {
        await pool.query(
          type === 'events'  ? 'UPDATE events  SET image_url    = $1 WHERE id = $2' :
          type === 'recipes' ? 'UPDATE recipes SET cover_image  = $1 WHERE id = $2' :
                               'UPDATE places  SET thumbnail_url = $1 WHERE id = $2',
          [newDbPath, row.id]
        );
        process.stdout.write('⊘ zaten var, DB güncellendi\n');
        stats.skip++;
      } catch (e) {
        process.stdout.write(`✗ DB hata: ${e.message}\n`);
        stats.fail++;
      }
      continue;
    }

    try {
      const buf = await downloadImage(row.url);
      fs.writeFileSync(localFile, buf);
      fs.writeFileSync(distFile, buf);

      await sftp.put(localFile, remotePath);

      await pool.query(
        type === 'events'  ? 'UPDATE events  SET image_url    = $1 WHERE id = $2' :
        type === 'recipes' ? 'UPDATE recipes SET cover_image  = $1 WHERE id = $2' :
                             'UPDATE places  SET thumbnail_url = $1 WHERE id = $2',
        [newDbPath, row.id]
      );

      process.stdout.write(`✓ (${(buf.length / 1024).toFixed(0)}KB)\n`);
      stats.ok++;
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
      stats.fail++;
    }

    await sleep(300);
  }
}

async function main() {
  console.log('\n📦 Harici görseller lokale indiriliyor...\n');
  console.log('SSH tünel kuruluyor...');
  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const pool = new pg.Pool({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    database: process.env.DB_USER, user: process.env.DB_USER, password: process.env.DB_PASS,
  });

  // Harici URL'leri sorgula
  const [eventsRes, recipesRes, placesRes] = await Promise.all([
    pool.query(`SELECT id, slug, image_url AS url FROM events WHERE image_url LIKE 'http%' ORDER BY slug`),
    pool.query(`SELECT id, slug, cover_image AS url FROM recipes WHERE cover_image LIKE 'http%' ORDER BY slug`),
    pool.query(`SELECT id, slug, thumbnail_url AS url FROM places WHERE thumbnail_url LIKE 'http%' ORDER BY slug`),
  ]);

  console.log(`📋 Harici URL sayıları:`);
  console.log(`   events.image_url:       ${eventsRes.rows.length}`);
  console.log(`   recipes.cover_image:    ${recipesRes.rows.length}`);
  console.log(`   places.thumbnail_url:   ${placesRes.rows.length}`);
  const total = eventsRes.rows.length + recipesRes.rows.length + placesRes.rows.length;
  console.log(`   TOPLAM: ${total}\n`);

  if (total === 0) {
    console.log('✅ Hiç harici URL yok, çıkılıyor.');
    await pool.end(); server.close(); ssh.end(); process.exit(0);
  }

  const sftp = new SftpClient();
  await sftp.connect({
    host: process.env.SSH_HOST,
    port: parseInt(process.env.SSH_PORT || '77'),
    username: process.env.SSH_USER,
    password: process.env.SSH_PASS,
  });

  const stats = { ok: 0, skip: 0, fail: 0 };

  if (eventsRes.rows.length > 0) {
    console.log(`\n--- Events (${eventsRes.rows.length}) ---`);
    await processType('events', eventsRes.rows, pool, sftp, stats);
  }

  if (recipesRes.rows.length > 0) {
    console.log(`\n--- Recipes (${recipesRes.rows.length}) ---`);
    await processType('recipes', recipesRes.rows, pool, sftp, stats);
  }

  if (placesRes.rows.length > 0) {
    console.log(`\n--- Places (${placesRes.rows.length}) ---`);
    await processType('places', placesRes.rows, pool, sftp, stats);
  }

  await sftp.end();

  console.log(`\n✅ Tamamlandı: ${stats.ok} indirilen, ${stats.skip} zaten var, ${stats.fail} hata`);

  // Kalan harici URL sayısını doğrula
  const [ev2, re2, pl2] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM events  WHERE image_url    LIKE 'http%'`),
    pool.query(`SELECT COUNT(*) FROM recipes WHERE cover_image  LIKE 'http%'`),
    pool.query(`SELECT COUNT(*) FROM places  WHERE thumbnail_url LIKE 'http%'`),
  ]);
  console.log(`\n📊 Kalan harici URL: events=${ev2.rows[0].count}, recipes=${re2.rows[0].count}, places=${pl2.rows[0].count}`);

  await pool.end();
  server.close();
  ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
