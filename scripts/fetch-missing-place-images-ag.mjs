#!/usr/bin/env node
/**
 * Session AG — 148 eksik mekan görseli için Pexels çekici.
 * DB'den görselsiz mekanları alır, kategori bazlı arama terimi üretir, indirir ve prod'a yükler.
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PEXELS_KEY = process.env.PEXELS_KEY || process.env.PEXELS_API_KEY;
const SSH_HOST   = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT   = parseInt(process.env.SSH_PORT || '77');
const SSH_USER   = process.env.SSH_USER || 'sanliur';
const SSH_PASS   = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

// Kategori adı → Pexels arama terimi (Türkçe → İngilizce, genel ve kaliteli sonuç verecek)
const CAT_QUERY = {
  'Restoranlar': 'restaurant interior turkish food table',
  'Kafeler': 'cozy cafe coffee interior wood',
  'Kebapçılar': 'turkish kebab grill skewer meat restaurant',
  'Ciğerciler': 'grilled liver kebab turkish street food',
  'Lahmacuncu': 'turkish flatbread lahmacun restaurant kitchen',
  'Pastaneler': 'pastry bakery sweets dessert shop display',
  'Camiler': 'mosque minaret stone historic architecture',
  'Türbeler': 'historic shrine mausoleum stone building',
  'Müzeler': 'museum interior exhibits artifacts display hall',
  'Oteller': 'hotel lobby modern architecture interior',
  'Butik Oteller': 'boutique hotel elegant room cozy interior',
  'Pansiyonlar': 'guesthouse cozy room wooden interior bed',
  'Konaklama': 'hotel accommodation room comfort',
  'Kaplıcalar': 'thermal hot spring pool water steam nature',
  'Alışveriş Merkezleri': 'modern shopping mall interior bright atrium',
  'Çarşılar': 'bazaar market spices colorful street turkey',
  'Kuyumcular': 'gold jewelry shop display bracelet necklace',
  'Berber & Kuaförler': 'barber shop interior styling grooming',
  'Güzellik Salonları': 'beauty salon nail hair styling',
  'Spor Salonları': 'gym fitness center equipment workout',
  'Fitness Merkezleri': 'modern gym fitness workout equipment interior',
  'Dövüş Sporları': 'martial arts training gym dojo mat',
  'Hastaneler': 'hospital building modern healthcare entrance',
  'Eczaneler': 'pharmacy drugstore interior shelves medication',
  'Sağlık Merkezleri': 'healthcare clinic medical center modern',
  'Bankalar': 'bank branch interior counter modern',
  'Kütüphaneler': 'library books shelves reading interior',
  'Okullar': 'school building education classroom exterior',
  'Üniversiteler': 'university campus building architecture',
  'Galeriler': 'car dealership showroom vehicles interior',
  'Oto Tamirciler': 'auto repair garage mechanic workshop',
  'Lastikçiler': 'tire shop automotive service',
  'Nakliyat': 'logistics truck transport warehouse',
  'İnşaat': 'construction site building crane architecture',
  'Tekstil': 'textile fabric manufacturing mill',
  'Tarım': 'farm agricultural field tractor harvest',
  'Arkeoloji': 'archaeological excavation ancient ruins stone',
  'Parklar': 'park garden green nature path outdoor',
  'Sahalar': 'sports field pitch green outdoor',
  'Golf': 'golf putting green mini golf outdoor',
  'Çocuk Aktiviteleri': 'children playground outdoor play fun',
  'Dil Kursları': 'language school classroom education books',
  'TV Kanalları': 'television studio broadcast media',
  'Valilik': 'government building administrative office',
  'Belediye': 'city hall municipal building stone architecture',
  'PTT': 'post office counter service',
  'Organizasyon': 'event organization conference meeting',
  'Turizm': 'tourism travel office map destination',
  'Hayvan': 'livestock market cattle farm animals',
  'Gıda': 'food production factory manufacturing',
  'default': 'sanliurfa turkey historic stone architecture',
};

function getQuery(categoryName, placeName) {
  if (!categoryName) {
    // Guess from place name
    const n = placeName.toLowerCase();
    if (n.includes('cami') || n.includes('mosque')) return CAT_QUERY['Camiler'];
    if (n.includes('türbe') || n.includes('türbesi')) return CAT_QUERY['Türbeler'];
    if (n.includes('müze')) return CAT_QUERY['Müzeler'];
    if (n.includes('otel') || n.includes('hotel')) return CAT_QUERY['Oteller'];
    if (n.includes('pansiyon')) return CAT_QUERY['Pansiyonlar'];
    if (n.includes('restoran') || n.includes('kebap')) return CAT_QUERY['Restoranlar'];
    if (n.includes('kafe') || n.includes('cafe')) return CAT_QUERY['Kafeler'];
    if (n.includes('banka') || n.includes('bbva') || n.includes('ziraat')) return CAT_QUERY['Bankalar'];
    if (n.includes('eczane')) return CAT_QUERY['Eczaneler'];
    if (n.includes('hastane')) return CAT_QUERY['Hastaneler'];
    if (n.includes('kütüphane')) return CAT_QUERY['Kütüphaneler'];
    if (n.includes('park') || n.includes('bahçe')) return CAT_QUERY['Parklar'];
    if (n.includes('fitness') || n.includes('spor')) return CAT_QUERY['Spor Salonları'];
    if (n.includes('baklava') || n.includes('pastane')) return CAT_QUERY['Pastaneler'];
    return CAT_QUERY['default'];
  }
  // Search by partial match
  for (const [key, val] of Object.entries(CAT_QUERY)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(categoryName.toLowerCase().split(' ')[0])) {
      return val;
    }
  }
  return `${categoryName.toLowerCase()} shop interior turkey` || CAT_QUERY['default'];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

// Cache queries to avoid hammering Pexels with duplicate terms
const queryCache = new Map();
async function pexelsSearch(query) {
  if (!PEXELS_KEY) return null;
  if (queryCache.has(query)) return queryCache.get(query);
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`;
  const r = await fetchUrl(url, { Authorization: PEXELS_KEY });
  if (r.status === 429) { await sleep(5000); return pexelsSearch(query); }
  if (r.status !== 200) { queryCache.set(query, null); return null; }
  const data = JSON.parse(r.body.toString());
  // Pick a random result from first 8 for variety
  const photos = data.photos || [];
  if (!photos.length) { queryCache.set(query, null); return null; }
  const pick = photos[Math.floor(Math.random() * Math.min(photos.length, 5))];
  const imgUrl = pick.src?.large2x || pick.src?.large || pick.src?.medium;
  // Don't cache to allow variety across same-category places
  return imgUrl || null;
}

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', 15440, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(15440, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server })).on('error', reject)
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    });
  });
}

async function main() {
  if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }
  if (!SSH_PASS)   { console.error('SSH_PASS eksik');   process.exit(1); }

  // Open SSH tunnel for DB
  process.stdout.write('SSH tünel... ');
  const { ssh, server } = await openSshTunnel();
  console.log('✓');

  const dbClient = new pg.Client({ host:'127.0.0.1', port:15440, user:process.env.DB_USER, password:process.env.DB_PASS, database:process.env.DB_NAME });
  await dbClient.connect();

  const r = await dbClient.query(`
    SELECT p.slug, p.name, cat.name as category
    FROM places p
    LEFT JOIN categories cat ON p.category_id = cat.id
    WHERE p.status='active' AND (p.thumbnail_url IS NULL OR p.thumbnail_url='')
    ORDER BY p.category_id, p.name
  `);
  const places = r.rows;
  console.log(`${places.length} mekan için görsel çekiliyor...\n`);

  // Open SFTP
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const localDir = path.join(projectRoot, 'public', 'uploads', 'places');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let ok = 0, skip = 0, fail = 0;

  for (const place of places) {
    const { slug, name, category } = place;
    process.stdout.write(`  ${ok + skip + fail + 1}/${places.length} ${slug.slice(0, 45)}... `);

    const localPath  = path.join(localDir, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/public/uploads/places/${slug}.jpg`;
    const distPath   = `${REMOTE_DIR}/dist/client/uploads/places/${slug}.jpg`;

    try {
      const query = getQuery(category, name);
      const imgUrl = await pexelsSearch(query);
      if (!imgUrl) { console.log('⊘ Pexels sonuç yok'); skip++; continue; }

      const imgBuf = await fetchUrl(imgUrl);
      if (imgBuf.status !== 200) { console.log(`⊘ indirme ${imgBuf.status}`); skip++; continue; }

      fs.writeFileSync(localPath, imgBuf.body);
      await sftp.put(localPath, remotePath);
      await sftp.put(localPath, distPath).catch(() => null);

      // Update DB thumbnail_url
      await dbClient.query(
        "UPDATE places SET thumbnail_url = $1 WHERE slug = $2",
        [`/uploads/places/${slug}.jpg`, slug]
      );

      console.log(`✓ (${Math.round(imgBuf.body.length / 1024)}KB)`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 50)}`);
      fail++;
    }
    await sleep(350);
  }

  await sftp.end();
  await dbClient.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Tamamlandı: ${ok} ✓, ${skip} atlandı, ${fail} hata`);
  console.log(`DB'de thumbnail_url güncellendi: ${ok} mekan`);
}

main().catch(e => { console.error(e); process.exit(1); });
