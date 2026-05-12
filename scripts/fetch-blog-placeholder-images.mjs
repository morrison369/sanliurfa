#!/usr/bin/env node
/**
 * blog_posts.featured_image='/og-image.png' kayıtları için Pexels'ten görsel.
 * Category + slug pattern → English query.
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
const LOCAL_TUNNEL_PORT = 15625;

const LOCAL_DIR = path.join(projectRoot, 'dist', 'client', 'uploads', 'blogs');
const REMOTE_DIR = `${REMOTE_BASE}/dist/client/uploads/blogs`;
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

function queryForBlog(slug, category) {
  const s = (slug || '').toLowerCase();
  const c = (category || '').toLowerCase();
  // Slug-based specific
  if (s.includes('gobekli')) return 'gobekli tepe ancient stone pillars archaeological';
  if (s.includes('balikligol')) return 'sacred fish pool mosque turkey sanliurfa';
  if (s.includes('harran')) return 'harran beehive house mudbrick ancient turkey';
  if (s.includes('halfeti')) return 'halfeti boat river euphrates submerged village turkey';
  if (s.includes('rumkale')) return 'rumkale medieval castle cliff river turkey';
  if (s.includes('birecik')) return 'birecik castle euphrates river turkey';
  if (s.includes('viransehir')) return 'mesopotamia anatolia town landscape turkey';
  if (s.includes('siverek')) return 'anatolia town traditional turkey hill';
  if (s.includes('karahantepe') || s.includes('nevali')) return 'neolithic ancient stone pillars archaeological';
  if (s.includes('kebap') || s.includes('kebab')) return 'urfa kebab grilled meat skewer turkish';
  if (s.includes('ciger')) return 'turkish liver kebab grilled spicy';
  if (s.includes('lahmacun')) return 'lahmacun turkish thin flatbread minced meat';
  if (s.includes('cig-kofte') || s.includes('icli-kofte')) return 'turkish bulgur kibbeh spicy appetizer';
  if (s.includes('baklava') || s.includes('kunefe')) return 'turkish dessert pastry syrup nuts pistachio';
  if (s.includes('kahvalti') || s.includes('breakfast')) return 'turkish breakfast spread tea olives cheese';
  if (s.includes('sira-gecesi') || s.includes('sıra')) return 'turkish folk music night gathering traditional';
  if (s.includes('muze')) return 'museum archaeology turkey exhibits ancient artifacts';
  if (s.includes('cami') || s.includes('mosque')) return 'historic mosque minaret stone turkey islamic';
  if (s.includes('kale')) return 'medieval castle fortress hilltop stone turkey';
  if (s.includes('tarih') || s.includes('arkeoloji')) return 'archaeological site ancient ruins anatolia';
  if (s.includes('foto') || s.includes('photo')) return 'photography travel landscape camera turkey';
  if (s.includes('alisveris') || s.includes('carsi') || s.includes('bazaar')) return 'turkish bazaar copper market shop traditional';
  if (s.includes('otel') || s.includes('konak')) return 'turkey boutique hotel courtyard stone heritage';
  if (s.includes('cocuk') || s.includes('aile')) return 'family travel children activity outdoor turkey';
  if (s.includes('saglik') || s.includes('spa')) return 'wellness spa relaxation natural turkey';
  if (s.includes('etkinlik') || s.includes('festival')) return 'turkish festival cultural event celebration';
  // Category-based fallback
  if (c.includes('gezi') || c.includes('seyahat')) return 'turkey travel landmark historical city anatolia';
  if (c.includes('gastronomi') || c.includes('yeme')) return 'turkish cuisine traditional food meal urfa';
  if (c.includes('kultur') || c.includes('etkinlik')) return 'turkish culture traditional anatolia festival';
  if (c.includes('rehber') || c.includes('sehir')) return 'sanliurfa turkey city aerial view landscape';
  if (c.includes('alisveris')) return 'turkish bazaar shopping market traditional';
  if (c.includes('arkeoloji')) return 'archaeological excavation ancient ruins anatolia';
  if (c.includes('konaklama')) return 'turkey hotel courtyard stone heritage';
  if (c.includes('aile')) return 'family travel children turkey activity';
  if (c.includes('saglik')) return 'wellness travel turkey relaxation';
  // Default
  return 'sanliurfa turkey landmark cultural travel destination';
}

async function fetchPexels(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    https.get(url, { headers: { Authorization: PEXELS_KEY } }, res => {
      if (res.statusCode !== 200) { reject(new Error('Pexels HTTP ' + res.statusCode)); return; }
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('parse fail')); } });
    }).on('error', reject).setTimeout(12000, function () { this.destroy(); reject(new Error('timeout')); });
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
  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await db.connect();

  const { rows } = await db.query(
    `SELECT id, slug, title, category FROM blog_posts WHERE status='published' AND featured_image='/og-image.png' ORDER BY slug`
  );
  console.log(`📋 ${rows.length} placeholder blog\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  try { await sftp.mkdir(REMOTE_DIR, true); } catch {}

  let ok = 0, fail = 0;
  for (const r of rows) {
    const q = queryForBlog(r.slug, r.category);
    process.stdout.write(`  → ${r.title.slice(0, 38).padEnd(38)} [${q.slice(0, 32).padEnd(32)}] `);
    try {
      const resp = await fetchPexels(q);
      if (!resp.photos?.length) { console.log('✗ no photo'); fail++; await new Promise(r => setTimeout(r, 600)); continue; }
      const p = resp.photos[0];
      const buf = await downloadBinary(p.src.large2x || p.src.large);
      const local = path.join(LOCAL_DIR, `${r.slug}.jpg`);
      fs.writeFileSync(local, buf);
      await sftp.put(local, `${REMOTE_DIR}/${r.slug}.jpg`);
      const dbUrl = `/uploads/blogs/${r.slug}.jpg`;
      await db.query(`UPDATE blog_posts SET featured_image=$1::text, cover_image=$2::text, updated_at=NOW() WHERE id=$3`, [dbUrl, dbUrl, r.id]);
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
