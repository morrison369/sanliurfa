#!/usr/bin/env node
/**
 * Çoklu kaynak (Pexels TR/EN + Unsplash TR/EN) ile place/recipe/blog/event/historical görsel
 * fetch. Pexels rate limit'ine yakalanırsa Unsplash'a düşer. Her record için:
 *   1) Pexels TR (record.name)
 *   2) Pexels EN (record.name + kategori EN hint)
 *   3) Unsplash TR
 *   4) Unsplash EN
 * İlk başarılı görseli alır.
 *
 * Kullanım:
 *   node scripts/refetch-multi-source-images.mjs --table=places --slugs=slug1,slug2
 *   node scripts/refetch-multi-source-images.mjs --table=places --duplicates  # duplicate image_url'lü
 *   node scripts/refetch-multi-source-images.mjs --table=recipes --shared-generic  # /images/hero/...
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
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const LOCAL_TUNNEL_PORT = 15640;

// --- CLI args ---
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : null;
}).filter(Boolean));
const TABLE = args.table || 'places';

// Table → column + folder + remote dir
const TABLE_MAP = {
  places: { col: 'image_url', thumbCol: 'thumbnail_url', folder: 'places', status: "status='active'" },
  recipes: { col: 'cover_image', folder: 'recipes', status: "status='published'" },
  blog_posts: { col: 'featured_image', thumbCol: 'cover_image', folder: 'blogs', status: "status='published'" },
  events: { col: 'image_url', folder: 'events', status: "status='published'" },
  historical_sites: { col: 'cover_image', folder: 'historical', status: "status='published'" },
};
const t = TABLE_MAP[TABLE];
if (!t) { console.error('Unknown table:', TABLE); process.exit(1); }

const LOCAL_DIR = path.join(projectRoot, 'dist', 'client', 'uploads', t.folder);
const REMOTE_DIR = `/home/sanliur/public_html/dist/client/uploads/${t.folder}`;
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

// --- HTTP ---
let pexelsExhausted = false;
function fetchJSON(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      // Pexels rate limit
      if (res.statusCode === 429) { pexelsExhausted = true; reject(new Error('rate-limited')); return; }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
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

// Used Pexels/Unsplash IDs in this session — avoid resuse
const usedIds = new Set();

async function pexelsSearch(query) {
  if (pexelsExhausted || !PEXELS_KEY) return null;
  // per_page=15 — daha çeşit, kullanılmayan ID seçme şansı
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`;
  try {
    const r = await fetchJSON(url, { Authorization: PEXELS_KEY });
    if (!r.photos?.length) return null;
    // Önce kullanılmamış olanı bul
    const fresh = r.photos.find(p => !usedIds.has(`pexels:${p.id}`));
    const pick = fresh || r.photos[Math.floor(Math.random() * Math.min(r.photos.length, 5))];
    usedIds.add(`pexels:${pick.id}`);
    return { url: pick.src.large2x || pick.src.large, id: pick.id, src: 'pexels' };
  } catch (e) {
    if (e.message === 'rate-limited') { pexelsExhausted = true; }
    return null;
  }
}

async function unsplashSearch(query) {
  if (!UNSPLASH_KEY) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`;
  try {
    const r = await fetchJSON(url, { Authorization: `Client-ID ${UNSPLASH_KEY}` });
    if (!r.results?.length) return null;
    const fresh = r.results.find(p => !usedIds.has(`unsplash:${p.id}`));
    const pick = fresh || r.results[Math.floor(Math.random() * Math.min(r.results.length, 5))];
    usedIds.add(`unsplash:${pick.id}`);
    return { url: pick.urls.regular, id: pick.id, src: 'unsplash' };
  } catch {
    return null;
  }
}

// Türkçe → İngilizce kategori hint
function categoryHintEN(cat) {
  if (!cat) return '';
  const c = cat.toLowerCase();
  if (c.includes('kebap')) return 'turkish kebab restaurant';
  if (c.includes('ciğer') || c.includes('ciger')) return 'turkish liver kebab';
  if (c.includes('lahmacun')) return 'lahmacun turkish pizza';
  if (c.includes('pide')) return 'turkish pide flatbread';
  if (c.includes('kahvaltı') || c.includes('kahvalti')) return 'turkish breakfast';
  if (c.includes('börek') || c.includes('borek')) return 'turkish borek pastry';
  if (c.includes('tatlı') || c.includes('tatli') || c.includes('baklava')) return 'turkish dessert';
  if (c.includes('kafe') || c.includes('cafe')) return 'turkish cafe coffee';
  if (c.includes('restoran')) return 'turkish restaurant dining';
  if (c.includes('otel') || c.includes('hotel') || c.includes('konak')) return 'boutique hotel turkey';
  if (c.includes('hastane')) return 'modern hospital';
  if (c.includes('eczane')) return 'pharmacy turkey';
  if (c.includes('diş')) return 'dental clinic';
  if (c.includes('okul')) return 'school education';
  if (c.includes('üniversite')) return 'university campus';
  if (c.includes('kütüphane')) return 'library books';
  if (c.includes('müze') || c.includes('muze')) return 'museum exhibits';
  if (c.includes('camii') || c.includes('cami')) return 'historic mosque minaret';
  if (c.includes('kilise')) return 'historic church';
  if (c.includes('kale')) return 'castle fortress turkey';
  if (c.includes('kuaför') || c.includes('berber')) return 'hair salon barber';
  if (c.includes('güzellik') || c.includes('estetik') || c.includes('spa')) return 'beauty salon spa';
  if (c.includes('avm') || c.includes('alışveriş merkezi')) return 'shopping mall interior';
  if (c.includes('giyim') || c.includes('moda')) return 'fashion clothing boutique';
  if (c.includes('ayakkabı')) return 'shoe store';
  if (c.includes('elektronik') || c.includes('bilgisayar')) return 'electronics technology';
  if (c.includes('emlak')) return 'real estate office';
  if (c.includes('oto') || c.includes('araç')) return 'auto repair car service';
  if (c.includes('kaporta') || c.includes('boya')) return 'auto body paint';
  if (c.includes('petrol') || c.includes('benzin')) return 'gas station fuel';
  if (c.includes('taksi')) return 'taxi service';
  if (c.includes('otobüs')) return 'bus station';
  if (c.includes('ptt') || c.includes('post')) return 'post office mail';
  if (c.includes('belediye') || c.includes('kaymakam')) return 'government building turkey';
  if (c.includes('itfaiye')) return 'fire station';
  if (c.includes('polis')) return 'police station';
  if (c.includes('park')) return 'park playground';
  if (c.includes('spor') || c.includes('fitness')) return 'gym fitness modern';
  if (c.includes('manav') || c.includes('market')) return 'turkish grocery market';
  if (c.includes('fırın') || c.includes('firin')) return 'turkish bakery bread oven';
  if (c.includes('kuruyemiş')) return 'turkish nuts dried fruits';
  if (c.includes('düğün')) return 'wedding hall venue';
  if (c.includes('saat')) return 'watch jewelry store';
  if (c.includes('berber')) return 'barber shop';
  return 'turkish local business store';
}

async function findBestImage(name, cat) {
  // 1. Pexels Turkish
  let img = await pexelsSearch(`${name} Şanlıurfa`);
  if (img) return img;
  await new Promise(r => setTimeout(r, 400));

  // 2. Pexels English
  const enHint = categoryHintEN(cat);
  img = await pexelsSearch(`${enHint} sanliurfa turkey`);
  if (img) return img;
  await new Promise(r => setTimeout(r, 400));

  // 3. Unsplash Turkish
  img = await unsplashSearch(`${name} Şanlıurfa`);
  if (img) return img;
  await new Promise(r => setTimeout(r, 400));

  // 4. Unsplash English
  img = await unsplashSearch(`${enHint} turkey`);
  return img;
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

function buildWhere() {
  // places uses alias 'p.', diğer tablolar bare column
  const slugCol = TABLE === 'places' ? 'p.slug' : 'slug';
  const imgCol = TABLE === 'places' ? `p.${t.col}` : t.col;
  const statusFull = TABLE === 'places' ? "p.status='active'" : t.status;
  if (args.slugs) {
    const list = String(args.slugs).split(',').map(s => `'${s.replace(/'/g, "''")}'`).join(',');
    return `${statusFull} AND ${slugCol} IN (${list})`;
  }
  if (args.duplicates) {
    return `${statusFull} AND ${imgCol} IN (SELECT ${t.col} FROM ${TABLE} WHERE ${t.status} GROUP BY ${t.col} HAVING COUNT(*) > 1)`;
  }
  if (args['shared-generic']) {
    return `${statusFull} AND ${imgCol} IN ('/images/hero/sanliurfa-editorial-food.webp', '/images/blog/sanliurfa-lezzetler-2026.webp')`;
  }
  console.error('No selector: use --slugs, --duplicates, or --shared-generic');
  process.exit(1);
}

async function main() {
  if (!PEXELS_KEY && !UNSPLASH_KEY) { console.error('PEXELS_API_KEY veya UNSPLASH_ACCESS_KEY gerekli'); process.exit(1); }
  console.log(`\n🖼  ${TABLE} — Pexels: ${PEXELS_KEY ? '✓' : '✗'} | Unsplash: ${UNSPLASH_KEY ? '✓' : '✗'}\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await db.connect();

  // Build query
  const where = buildWhere();
  let selectQuery;
  if (TABLE === 'places') {
    selectQuery = `SELECT p.id, p.slug, p.name, COALESCE(c.name, '') AS cat FROM places p LEFT JOIN categories c ON c.id=p.category_id WHERE ${where} ORDER BY p.slug`;
  } else if (TABLE === 'recipes') {
    selectQuery = `SELECT id, slug, name, '' AS cat FROM recipes WHERE ${where} ORDER BY slug`;
  } else if (TABLE === 'blog_posts') {
    selectQuery = `SELECT id, slug, title AS name, COALESCE(category, '') AS cat FROM blog_posts WHERE ${where} ORDER BY slug`;
  } else if (TABLE === 'events') {
    selectQuery = `SELECT id, slug, title AS name, COALESCE(category, '') AS cat FROM events WHERE ${where} ORDER BY slug`;
  } else if (TABLE === 'historical_sites') {
    selectQuery = `SELECT id, slug, name, '' AS cat FROM historical_sites WHERE ${where} ORDER BY slug`;
  }

  const { rows } = await db.query(selectQuery);
  console.log(`📋 ${rows.length} kayıt işlenecek\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  try { await sftp.mkdir(REMOTE_DIR, true); } catch {}

  let ok = 0, fail = 0, srcStats = { pexels: 0, unsplash: 0 };
  for (const r of rows) {
    const label = `${r.name || r.slug}`.slice(0, 35).padEnd(35);
    process.stdout.write(`  → ${label} [${(r.cat || '').slice(0, 15).padEnd(15)}] `);
    try {
      const img = await findBestImage(r.name || r.slug, r.cat);
      if (!img) { console.log(`✗ no image (pexels-exhausted=${pexelsExhausted})`); fail++; continue; }
      const buf = await downloadBinary(img.url);
      const local = path.join(LOCAL_DIR, `${r.slug}.jpg`);
      fs.writeFileSync(local, buf);
      await sftp.put(local, `${REMOTE_DIR}/${r.slug}.jpg`);
      const dbUrl = `/uploads/${t.folder}/${r.slug}.jpg`;
      // UPDATE
      if (t.thumbCol) {
        await db.query(`UPDATE ${TABLE} SET ${t.col}=$1::text, ${t.thumbCol}=$2::text, updated_at=NOW() WHERE id=$3`, [dbUrl, dbUrl, r.id]);
      } else {
        await db.query(`UPDATE ${TABLE} SET ${t.col}=$1::text, updated_at=NOW() WHERE id=$2`, [dbUrl, r.id]);
      }
      console.log(`✓ [${img.src}] #${img.id} (${Math.round(buf.length / 1024)}KB)`);
      ok++; srcStats[img.src]++;
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 40)}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  await sftp.end();
  await db.end();
  server.close(); ssh.end();
  console.log(`\n✅ ${ok} başarılı, ${fail} fail | Pexels: ${srcStats.pexels} | Unsplash: ${srcStats.unsplash}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
