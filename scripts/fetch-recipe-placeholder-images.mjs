#!/usr/bin/env node
/**
 * Recipes tablosunda cover_image='/og-image.png' olan kayıtlar için Pexels'ten
 * görsel indirir. Slug pattern'inden English Pexels query türetir.
 *
 * Pattern: kebap/kebab → kebab; corba → soup; tatli/baklava → dessert; etc.
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';

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

const PEXELS_KEY = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY;
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_BASE = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
const LOCAL_TUNNEL_PORT = 15620;

const LOCAL_DIR = path.join(projectRoot, 'dist', 'client', 'uploads', 'recipes');
const REMOTE_DIR = `${REMOTE_BASE}/dist/client/uploads/recipes`;

if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

// Slug pattern → English Pexels query
function querytForSlug(slug) {
  const s = slug.toLowerCase();
  // Specific ingredients/dishes
  if (s.includes('icli-kofte')) return 'turkish stuffed bulgur kibbeh middle eastern';
  if (s.includes('cig-kofte')) return 'turkish raw bulgur kibbeh appetizer red';
  if (s.includes('kofte') || s.includes('koft')) return 'turkish meatballs grilled koftesi';
  if (s.includes('kebap') || s.includes('kebab')) return 'turkish kebab grilled meat skewer urfa';
  if (s.includes('lahmacun')) return 'lahmacun turkish thin pizza minced meat flatbread';
  if (s.includes('pide')) return 'turkish pide flatbread cheese meat oven';
  if (s.includes('borek') || s.includes('börek')) return 'turkish borek phyllo pastry savory';
  if (s.includes('baklava')) return 'baklava turkish dessert phyllo nuts honey syrup';
  if (s.includes('kunefe') || s.includes('künefe')) return 'kunefe turkish cheese pastry syrup dessert';
  if (s.includes('sutlac')) return 'turkish rice pudding sutlac dessert creamy';
  if (s.includes('kadayif')) return 'kadayif turkish shredded pastry dessert syrup';
  if (s.includes('tatli') || s.includes('helva')) return 'turkish dessert sweet syrup nuts';
  if (s.includes('corba')) return 'turkish soup lentil traditional bowl';
  if (s.includes('pilav')) return 'turkish pilaf rice bulgur traditional grain';
  if (s.includes('dolma') || s.includes('sarma')) return 'turkish stuffed dolma grape leaves rice';
  if (s.includes('mucver') || s.includes('müver')) return 'turkish vegetable fritter mucver pancake';
  if (s.includes('haydari') || s.includes('cacik')) return 'turkish yogurt mezze appetizer dip';
  if (s.includes('ezme') || s.includes('bostana')) return 'turkish meze appetizer red pepper tomato';
  if (s.includes('salata')) return 'turkish salad fresh vegetables greens';
  if (s.includes('ekmek') || s.includes('bazlama') || s.includes('lavas')) return 'turkish bread fresh oven traditional';
  if (s.includes('ciger')) return 'turkish liver kebab grilled spicy';
  if (s.includes('pirzola') || s.includes('antrikot')) return 'grilled lamb chop steak meat';
  if (s.includes('tavuk') || s.includes('kanat')) return 'grilled chicken turkish kebab';
  if (s.includes('balik')) return 'grilled fish turkish seafood';
  if (s.includes('patlican')) return 'turkish eggplant dish grilled aubergine';
  if (s.includes('biber') || s.includes('isot')) return 'turkish red pepper isot spice food';
  if (s.includes('zeytin') || s.includes('zeytinyagli')) return 'turkish olive oil dish mediterranean';
  if (s.includes('kuru-fasulye') || s.includes('nohut') || s.includes('mercimek')) return 'turkish bean lentil stew traditional';
  if (s.includes('manti')) return 'turkish manti dumplings yogurt sauce';
  if (s.includes('borani') || s.includes('keskek')) return 'turkish yogurt grain dish traditional';
  if (s.includes('asure')) return 'asure noah pudding turkish dessert grains nuts';
  if (s.includes('katmer')) return 'katmer turkish pistachio pastry dessert';
  if (s.includes('simit')) return 'simit turkish sesame bread ring';
  if (s.includes('bici') || s.includes('sutlu')) return 'turkish milk dessert creamy traditional';
  if (s.includes('kahve') || s.includes('mirra')) return 'turkish coffee cup traditional brass';
  if (s.includes('cay')) return 'turkish tea glass traditional pot';
  // Default Urfa cuisine
  return 'turkish urfa traditional food cuisine meal';
}

async function fetchPexels(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const opts = { headers: { Authorization: PEXELS_KEY } };
    const req = https.get(url, opts, res => {
      if (res.statusCode !== 200) { reject(new Error('Pexels HTTP ' + res.statusCode)); return; }
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error('parse fail')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = u => https.get(u, res => {
      if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).setTimeout(20000, function () { this.destroy(); reject(new Error('dl timeout')); });
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
  });
}

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_API_KEY eksik'); process.exit(1); }
  if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await db.connect();

  const { rows } = await db.query(
    `SELECT id, slug, name FROM recipes WHERE status='published' AND cover_image='/og-image.png' ORDER BY slug`
  );
  console.log(`📋 ${rows.length} placeholder tarif\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  try { await sftp.mkdir(REMOTE_DIR, true); } catch { /* exists */ }

  let ok = 0, fail = 0;
  for (const r of rows) {
    const q = querytForSlug(r.slug);
    process.stdout.write(`  → ${r.name.slice(0, 35).padEnd(35)} [${q.slice(0, 30).padEnd(30)}] `);
    try {
      const resp = await fetchPexels(q);
      if (!resp.photos?.length) { console.log('✗ no photo'); fail++; await new Promise(r => setTimeout(r, 600)); continue; }
      const p = resp.photos[0];
      const buf = await downloadBinary(p.src.large2x || p.src.large);
      const local = path.join(LOCAL_DIR, `${r.slug}.jpg`);
      fs.writeFileSync(local, buf);
      await sftp.put(local, `${REMOTE_DIR}/${r.slug}.jpg`);
      const dbUrl = `/uploads/recipes/${r.slug}.jpg`;
      await db.query(`UPDATE recipes SET cover_image=$1, updated_at=NOW() WHERE id=$2`, [dbUrl, r.id]);
      console.log(`✓ #${p.id} (${Math.round(buf.length / 1024)}KB)`);
      ok++;
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 40)}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 1100));
  }

  await sftp.end();
  await db.end();
  server.close(); ssh.end();
  console.log(`\n✅ ${ok} başarılı, ${fail} fail`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
