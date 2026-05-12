#!/usr/bin/env node
/**
 * Harici Pexels URL'lerini yerel diske indir ve DB'yi güncelle.
 * node scripts/localize-place-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';

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

const LOCAL_PORT = 15625;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'sanliurfa.com/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
          host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER, password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n📸 Harici Pexels URL\'lerini yerel diske indir\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT slug, name, image_url FROM places
    WHERE status='active' AND image_url LIKE 'http%'
    ORDER BY name
  `);

  console.log(`📋 ${rows.length} harici görsel tespit edildi\n`);

  let ok = 0, skip = 0, fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    const ext = '.jpg';
    const localRel = `uploads/places/${item.slug}${ext}`;
    const localPath = path.join(projectRoot, 'public', localRel);
    const distPath = path.join(projectRoot, 'dist', 'client', localRel);
    const dbPath = `/${localRel}`;

    process.stdout.write(`[${i+1}/${rows.length}] ${item.slug.substring(0, 45)}... `);

    // Yerel dosya zaten varsa sadece DB güncelle
    if (fs.existsSync(localPath)) {
      await client.query('UPDATE places SET image_url=$1 WHERE slug=$2', [dbPath, item.slug]);
      console.log(`↺ DB güncellendi (dosya mevcut)`);
      ok++;
      skip++;
      continue;
    }

    try {
      await downloadFile(item.image_url, localPath);

      // dist/client'e kopyala
      fs.mkdirSync(path.dirname(distPath), { recursive: true });
      fs.copyFileSync(localPath, distPath);

      // DB güncelle
      await client.query('UPDATE places SET image_url=$1 WHERE slug=$2', [dbPath, item.slug]);

      const size = Math.round(fs.statSync(localPath).size / 1024);
      console.log(`✓ ${size}KB`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 60)}`);
      fail++;
    }

    await sleep(200);
  }

  await client.end(); server.close(); ssh.end();
  console.log(`\n✅ ${ok} görsel indirildi/güncellendi (${skip} mevcut) | ✗ ${fail} başarısız`);
}

main().catch(e => { console.error(e); process.exit(1); });
