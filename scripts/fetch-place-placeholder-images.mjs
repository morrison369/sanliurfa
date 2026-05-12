#!/usr/bin/env node
/**
 * places.image_url='/og-image.png' kayıtları için Pexels'ten görsel.
 * Category name → English Pexels query (kapsamlı mapping).
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
const LOCAL_TUNNEL_PORT = 15630;
const REMOTE_DIR = '/home/sanliur/public_html/dist/client/uploads/places';
const LOCAL_DIR = path.join(projectRoot, 'dist', 'client', 'uploads', 'places');
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

function queryForCategory(cat) {
  const c = (cat || '').toLowerCase();
  // Yeme-içme
  if (c.includes('kebap')) return 'urfa kebab grilled meat skewer turkish';
  if (c.includes('cig kof') || c.includes('çiğ köf')) return 'turkish bulgur kibbeh raw red appetizer';
  if (c.includes('ciğer') || c.includes('ciger')) return 'turkish liver kebab grilled';
  if (c.includes('lahmacun')) return 'lahmacun turkish thin pizza minced flatbread';
  if (c.includes('pide')) return 'turkish pide flatbread cheese oven';
  if (c.includes('tatlı') || c.includes('tatli') || c.includes('baklava')) return 'turkish dessert pastry syrup pistachio';
  if (c.includes('künefe') || c.includes('kunefe')) return 'kunefe turkish cheese pastry syrup';
  if (c.includes('kahvaltı') || c.includes('kahvalti')) return 'turkish breakfast spread olives cheese tea';
  if (c.includes('döner') || c.includes('doner')) return 'turkish doner kebab street food';
  if (c.includes('börek') || c.includes('borek')) return 'turkish borek phyllo pastry savory';
  if (c.includes('manti')) return 'turkish manti dumplings yogurt';
  if (c.includes('tavuk')) return 'grilled chicken turkish kebab';
  if (c.includes('yöresel') || c.includes('yoresel')) return 'turkish traditional cuisine local food urfa';
  if (c.includes('ev yemek')) return 'turkish home cooked traditional meal';
  if (c.includes('restoran') || c.includes('restaurant')) return 'turkish restaurant elegant dining urfa';
  if (c.includes('kafe') || c.includes('cafe')) return 'turkish cafe coffee modern interior';
  if (c.includes('nargile')) return 'hookah cafe lounge ambiance traditional';
  if (c.includes('fırın') || c.includes('firin')) return 'turkish bakery bread fresh oven';
  if (c.includes('pasta')) return 'turkish patisserie cakes bakery elegant';
  if (c.includes('su bayi')) return 'water delivery store dispenser';
  if (c.includes('manav')) return 'fruit vegetable market fresh produce';
  if (c.includes('market') || c.includes('süpermarket')) return 'turkish grocery supermarket store';
  if (c.includes('kasap')) return 'butcher meat shop fresh';
  if (c.includes('şarkü') || c.includes('sarku')) return 'deli charcuterie cheese food shop';
  if (c.includes('kuruyemiş') || c.includes('kuruyemis')) return 'turkish nuts dried fruits market';
  // Konaklama
  if (c.includes('otel') || c.includes('hotel')) return 'turkey boutique hotel courtyard heritage';
  if (c.includes('apart') || c.includes('pansiyon')) return 'turkey apartment hotel modern interior';
  if (c.includes('kamp')) return 'camping nature outdoor tent forest';
  // Sağlık
  if (c.includes('hastane')) return 'modern hospital medical center clean';
  if (c.includes('eczane')) return 'pharmacy turkey medicine shelves modern';
  if (c.includes('diş') || c.includes('dis ')) return 'dental clinic modern clean';
  if (c.includes('klinik')) return 'medical clinic modern healthcare';
  if (c.includes('veter')) return 'veterinary clinic pet care';
  if (c.includes('fizyo')) return 'physical therapy rehabilitation clinic';
  if (c.includes('göz') || c.includes('goz') || c.includes('optik')) return 'optometry eye care clinic';
  // Eğitim
  if (c.includes('okul') || c.includes('school')) return 'school education building modern';
  if (c.includes('kurs') || c.includes('etüt')) return 'tutoring education learning students';
  if (c.includes('üniversite')) return 'university campus buildings turkey academic';
  if (c.includes('kreş') || c.includes('anaokul')) return 'kindergarten preschool children colorful';
  if (c.includes('kütüphane')) return 'library books reading hall study';
  if (c.includes('müze') || c.includes('muze')) return 'museum exhibits ancient artifacts';
  // Ulaşım
  if (c.includes('otobüs') || c.includes('otobus')) return 'bus station terminal travel';
  if (c.includes('havalimanı') || c.includes('havaliman') || c.includes('uçak')) return 'airport terminal departures travel';
  if (c.includes('taksi')) return 'taxi service car waiting';
  if (c.includes('oto kiralama') || c.includes('rent')) return 'rental car service vehicles fleet';
  if (c.includes('petrol') || c.includes('benzin')) return 'gas station fuel pump service';
  // Alışveriş
  if (c.includes('avm') || c.includes('alışveriş merkezi')) return 'shopping mall interior modern stores';
  if (c.includes('giyim') || c.includes('moda')) return 'fashion clothing boutique store';
  if (c.includes('ayakkabı') || c.includes('ayakkabi')) return 'shoe store footwear fashion';
  if (c.includes('mücevher') || c.includes('kuyum')) return 'jewelry store gold silver';
  if (c.includes('elektronik') || c.includes('bilgisayar')) return 'electronics store technology gadgets';
  if (c.includes('mobilya') || c.includes('beyaz eşya')) return 'furniture appliance store home';
  if (c.includes('çiçek') || c.includes('cicek')) return 'florist flowers shop bouquet';
  if (c.includes('hediyelik')) return 'gift shop souvenirs traditional turkey';
  // Hizmetler
  if (c.includes('kuaför') || c.includes('berber')) return 'hair salon barber shop modern';
  if (c.includes('güzellik') || c.includes('estetik')) return 'beauty salon spa modern interior';
  if (c.includes('matbaa') || c.includes('kırtasiye')) return 'stationery shop print bookstore';
  if (c.includes('emlak')) return 'real estate office building modern';
  if (c.includes('noter') || c.includes('avukat') || c.includes('hukuk')) return 'lawyer notary office professional';
  // Oto
  if (c.includes('oto') || c.includes('araç') || c.includes('arac')) return 'car repair auto service garage';
  if (c.includes('kaporta') || c.includes('boya')) return 'auto body repair car paint';
  if (c.includes('lastik')) return 'tire shop auto wheel service';
  if (c.includes('yedek parça') || c.includes('yedek parca')) return 'auto parts store spare shelves';
  // Devlet
  if (c.includes('kaymakam') || c.includes('belediye') || c.includes('vali')) return 'government building turkey municipality';
  if (c.includes('vergi') || c.includes('sgk') || c.includes('iskur')) return 'government office bureau administration';
  if (c.includes('ptt') || c.includes('post')) return 'post office mail service modern';
  if (c.includes('nüfus') || c.includes('nufus') || c.includes('tapu')) return 'civil registry land office government';
  // Dini
  if (c.includes('camii') || c.includes('cami') || c.includes('mosque')) return 'historic mosque minaret stone turkey';
  if (c.includes('kilise')) return 'historic church stone byzantine architecture';
  // Spor
  if (c.includes('spor') || c.includes('fitness')) return 'gym fitness center modern equipment';
  if (c.includes('yüzme') || c.includes('havuz')) return 'swimming pool modern facility';
  if (c.includes('halı saha') || c.includes('hali saha')) return 'football pitch indoor field';
  // Acil
  if (c.includes('itfaiye')) return 'fire station truck building';
  if (c.includes('polis')) return 'police station building modern';
  // Aile & Çocuk
  if (c.includes('oyun') || c.includes('park')) return 'playground park children colorful';
  // Default
  return 'sanliurfa turkey local business street view';
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

  const { rows } = await db.query(`
    SELECT p.id, p.slug, p.name, COALESCE(c.name, '') AS cat
    FROM places p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status='active' AND p.image_url='/og-image.png'
    ORDER BY p.slug
  `);
  console.log(`📋 ${rows.length} placeholder place\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  try { await sftp.mkdir(REMOTE_DIR, true); } catch {}

  let ok = 0, fail = 0;
  for (const r of rows) {
    const q = queryForCategory(r.cat);
    process.stdout.write(`  → ${r.name.slice(0, 32).padEnd(32)} [${r.cat.slice(0, 18).padEnd(18)}|${q.slice(0, 22)}] `);
    try {
      const resp = await fetchPexels(q);
      if (!resp.photos?.length) { console.log('✗ no photo'); fail++; await new Promise(r => setTimeout(r, 600)); continue; }
      const p = resp.photos[0];
      const buf = await downloadBinary(p.src.large2x || p.src.large);
      const local = path.join(LOCAL_DIR, `${r.slug}.jpg`);
      fs.writeFileSync(local, buf);
      await sftp.put(local, `${REMOTE_DIR}/${r.slug}.jpg`);
      const dbUrl = `/uploads/places/${r.slug}.jpg`;
      await db.query(`UPDATE places SET image_url=$1::text, thumbnail_url=$2::text, updated_at=NOW() WHERE id=$3`, [dbUrl, dbUrl, r.id]);
      console.log(`✓ #${p.id} (${Math.round(buf.length / 1024)}KB)`);
      ok++;
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 30)}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 900));
  }

  await sftp.end();
  await db.end();
  server.close(); ssh.end();
  console.log(`\n✅ ${ok} başarılı, ${fail} fail`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
