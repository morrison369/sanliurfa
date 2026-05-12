#!/usr/bin/env node
/**
 * Batch3 12 yeni tarif için Pexels görsel indir + SFTP yükle + DB güncelle
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
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));

const PEXELS_KEY = process.env.PEXELS_KEY;
const LOCAL_TUNNEL_PORT = 15581;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RECIPES = [
  { slug: 'ciger-kebabi',        query: 'liver kebab turkish street food grilled meat skewer' },
  { slug: 'dugun-corbasi',       query: 'turkish wedding soup lamb yogurt traditional' },
  { slug: 'fistikli-kebap',      query: 'pistachio kebab turkish meat dish nuts' },
  { slug: 'kuru-fasulye-urfa-usulu', query: 'turkish white bean stew lamb meat traditional' },
  { slug: 'kanat-kebabi',        query: 'chicken wings kebab grilled turkish spicy' },
  { slug: 'ekmek-kadayifi',      query: 'turkish bread dessert syrup cream sweet pastry' },
  { slug: 'menemen-urfa-usulu',  query: 'menemen turkish eggs tomato pepper scrambled' },
  { slug: 'harira-corbasi',      query: 'chickpea lentil soup middle eastern traditional' },
  { slug: 'topik',               query: 'chickpea appetizer middle eastern mezze traditional' },
  { slug: 'balli-yumurta',       query: 'honey eggs breakfast turkish traditional food' },
  { slug: 'patlican-kavurmasi',  query: 'eggplant saute turkish dish roasted vegetables' },
  { slug: 'susamli-corek',       query: 'sesame bread ring turkish simit bun bakery' },
];

const LOCAL_DIR  = path.join(projectRoot, 'public', 'uploads', 'recipes');
const DIST_DIR   = path.join(projectRoot, 'dist', 'client', 'uploads', 'recipes');
const REMOTE_DIR = '/home/sanliur/public_html/uploads/recipes';

fs.mkdirSync(LOCAL_DIR, { recursive: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

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
    ssh.on('error', reject); server.on('error', reject);
  });
}

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  const data = await res.json();
  return data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;
}

async function main() {
  console.log('\n🖼️  12 batch3 tarif görseli indiriliyor...\n');
  const { ssh, server } = await openSshTunnel();
  const pool = new pg.Pool({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, database: process.env.DB_USER, user: process.env.DB_USER, password: process.env.DB_PASS });

  const sftp = new SftpClient();
  await sftp.connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS });

  let ok = 0, skip = 0, fail = 0;

  for (const { slug, query } of RECIPES) {
    const localFile = path.join(LOCAL_DIR, `${slug}.jpg`);
    const distFile  = path.join(DIST_DIR, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/${slug}.jpg`;
    const newPath = `/uploads/recipes/${slug}.jpg`;

    process.stdout.write(`  ${slug} ... `);

    if (fs.existsSync(localFile)) {
      // Sadece DB'yi güncelle
      await pool.query(`UPDATE recipes SET cover_image = $1 WHERE slug = $2`, [newPath, slug]).catch(() => {});
      process.stdout.write('⊘ zaten var\n'); skip++; continue;
    }

    try {
      const pexelsUrl = await fetchPexels(query);
      if (!pexelsUrl) throw new Error('Sonuç yok');
      const res = await fetch(pexelsUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(localFile, buf);
      fs.writeFileSync(distFile, buf);
      await sftp.put(localFile, remotePath);
      await pool.query(`UPDATE recipes SET cover_image = $1 WHERE slug = $2`, [newPath, slug]);
      process.stdout.write(`✓ (${(buf.length/1024).toFixed(0)}KB)\n`); ok++;
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`); fail++;
    }
    await sleep(400);
  }

  await sftp.end();
  await pool.end(); server.close(); ssh.end();
  console.log(`\n✅ ${ok} yeni, ${skip} zaten var, ${fail} hata`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
