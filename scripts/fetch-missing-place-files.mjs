#!/usr/bin/env node
/**
 * DB'de image_url dolu ama yerel dosya eksik olan tüm mekanlar için Pexels görsel indir.
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

const PEXELS_KEY = process.env.PEXELS_KEY;
if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 15546;
const PUBLIC_DIR = path.join(projectRoot, 'public', 'uploads', 'places');
const DIST_DIR   = path.join(projectRoot, 'dist', 'client', 'uploads', 'places');
const REMOTE_DIR = '/home/sanliur/public_html/dist/client/uploads/places';

// Category name → Pexels query
const CAT_QUERIES = {
  'Dönerciler': 'doner kebab turkish street food',
  'Tavukçular': 'grilled chicken restaurant food',
  'Ev yemekleri': 'home cooked food traditional restaurant',
  'Nargile kafeler': 'hookah cafe lounge ambiance',
  'Tatlı kafeler': 'dessert cafe sweets bakery',
  'Kitap kafeler': 'book cafe reading library cozy',
  'Fırınlar': 'bakery bread fresh oven',
  'Fast food': 'fast food restaurant meal',
  'Burger': 'burger hamburger food restaurant',
  'Pizza': 'pizza italian restaurant food',
  'Tost': 'toast sandwich food cafe',
  'Sandviç': 'sandwich food deli lunch',
  'Kuruyemişçiler': 'nuts dried fruits market shop',
  'Kasaplar': 'butcher meat shop fresh',
  'Şarküteriler': 'deli charcuterie cheese food',
  'Manavlar': 'fruit vegetable market fresh produce',
  'Marketler': 'grocery store market supermarket',
  'Süpermarketler': 'supermarket grocery store shopping',
  'Su bayileri': 'water dispenser delivery service',
  'Poliklinikler': 'clinic medical center modern health',
  'Diş klinikleri': 'dental clinic modern clean',
  'Ağız ve diş sağlığı merkezleri': 'dental center oral health',
  'Veteriner klinikleri': 'veterinary clinic pet care',
  'Psikologlar': 'psychology therapy office calm',
  'Psikiyatristler': 'psychiatry mental health clinic',
  'Diyetisyenler': 'nutritionist dietitian healthy food',
  'Fizyoterapistler': 'physical therapy rehabilitation clinic',
  'Göz merkezleri': 'optometry eye care clinic',
  'Tıbbi laboratuvarlar': 'medical laboratory health test',
  'Kaymakamlıklar': 'government office administration building',
  'Nüfus müdürlükleri': 'government office civil registry',
  'Tapu müdürlükleri': 'government land registry office',
  'Vergi daireleri': 'tax office government building',
  'SGK müdürlükleri': 'social security office government',
  'İŞKUR': 'employment office job center',
  'Noterler': 'notary office professional services',
  'PTT şubeleri': 'post office mail service',
  'Ticaret odası': 'chamber commerce business office',
  'Esnaf odaları': 'trade guild office professional',
  'Oto servisler': 'auto repair garage mechanic',
  'Kaportacılar': 'auto body repair car dent',
  'Boyacılar': 'auto paint car painting',
  'Oto elektrikçiler': 'auto electrician car electronics',
  'Oto yıkama': 'car wash auto cleaning',
  'Oto aksesuar': 'car accessories auto parts store',
  'Motosiklet servisleri': 'motorcycle repair service',
  'Yedek parça satıcıları': 'auto parts store spare parts',
  'Giyim mağazaları': 'clothing store fashion retail',
  'Kadın giyim': 'women fashion clothing boutique',
  'Erkek giyim': 'men fashion clothing store',
  'Çocuk giyim': 'children clothing kids fashion',
  'Ayakkabıcılar': 'shoe store footwear fashion',
  'Çantacılar': 'handbag purse accessories store',
  'Saatçiler': 'watch store jewelry timepiece',
  'Bilgisayarcılar': 'computer store technology electronics',
  'Elektronik mağazaları': 'electronics store gadgets technology',
  'Beyaz eşya mağazaları': 'home appliance store modern',
  'Mobilyacılar': 'furniture store modern interior',
  'Ev dekorasyon': 'home decoration interior design',
  'Züccaciyeler': 'kitchenware tableware store',
  'Yapı marketler': 'hardware store building materials',
  'Perdeciler': 'curtain store window drapes',
  'Oyuncakçılar': 'toy store children toys colorful',
  'Kırtasiyeler': 'stationery office supply store',
  'Kuaförler': 'hair salon beauty professional',
  'Erkek kuaförleri': 'barber shop men hair grooming',
  'Güzellik merkezleri': 'beauty center spa wellness',
  'Spa / masaj salonları': 'spa massage relaxation wellness',
  'Gelinlikçiler': 'wedding dress bridal boutique',
  'Terziler': 'tailor sewing clothing alterations',
  'Kuru temizleme': 'dry cleaning laundry service',
  'Fotoğrafçılar': 'photography studio professional camera',
  'Matbaalar': 'printing press print shop',
  'Anaokulları': 'kindergarten preschool children education',
  'Sürücü kursları': 'driving school car lesson education',
  'Dershaneler': 'study center tutoring education classroom',
  'Müzik kursları': 'music school lesson instrument',
  'Parklar': 'city park green nature trees',
  'Piknik alanları': 'picnic area nature outdoor',
  'Mesire alanları': 'forest recreation area nature',
  'Çarşılar': 'bazaar market traditional turkish',
  'Seyir terasları': 'viewpoint scenic overlook panorama',
  'Doğal güzellikler': 'nature scenic beautiful landscape',
  'Tur şirketleri': 'travel agency tourism office',
  'Rehberli turlar': 'guided tour historic archaeological',
  'Halı yıkama': 'carpet cleaning rug wash service',
  'Tesisatçılar': 'plumber plumbing service repair',
  'Elektrikçiler': 'electrician electrical service repair',
  'Çilingirler': 'locksmith key security lock',
  'Beyaz eşya servisleri': 'appliance repair service technician',
  'Güvenlik sistemleri': 'security system camera cctv',
  'Günlük kiralık daireler': 'apartment short term rental cozy',
  'Kamp alanları': 'camping area nature tent outdoor',
  'Satılık daire': 'real estate apartment building modern',
  'Kiralık daire': 'apartment rental modern interior',
};

function getCatQuery(catName) {
  if (!catName) return 'business service turkey';
  for (const [k, q] of Object.entries(CAT_QUERIES)) {
    if (catName.includes(k) || k.includes(catName)) return q;
  }
  return 'turkey local business service shop';
}

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  const data = await res.json();
  return data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;
}

async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('\n🖼️  Dosyası eksik mekanlar için görsel indiriliyor...\n');
  for (const d of [PUBLIC_DIR, DIST_DIR]) fs.mkdirSync(d, { recursive: true });

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const dbClient = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
  await dbClient.connect();

  const { rows: places } = await dbClient.query(`
    SELECT p.id, p.slug, p.name, COALESCE(c.name, p.category) AS cat
    FROM places p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active'
    ORDER BY p.id
  `);

  // Filter: local file missing
  const missing = places.filter(p => !fs.existsSync(path.join(PUBLIC_DIR, `${p.slug}.jpg`)));
  console.log(`📋 ${missing.length} mekan için dosya eksik (${places.length} toplam aktif)\n`);

  const sftp = new SftpClient();
  await sftp.connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS });
  try { await sftp.mkdir(REMOTE_DIR, true); } catch {}

  let ok = 0, fail = 0;
  for (const place of missing) {
    const localPath = path.join(PUBLIC_DIR, `${place.slug}.jpg`);
    process.stdout.write(`  → ${place.name.slice(0, 45)}... `);
    try {
      const imageUrl = await fetchPexels(getCatQuery(place.cat));
      if (!imageUrl) throw new Error('Pexels sonuç yok');
      const buf = await downloadImage(imageUrl);
      fs.writeFileSync(localPath, buf);
      fs.writeFileSync(path.join(DIST_DIR, `${place.slug}.jpg`), buf);
      await sftp.put(localPath, `${REMOTE_DIR}/${place.slug}.jpg`);
      console.log('✓');
      ok++;
      await sleep(500);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(300);
    }
  }

  await sftp.end();
  await dbClient.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} görsel, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
