#!/usr/bin/env node
/**
 * 8 yeni tarihi yer ekler → toplam 20
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_TR } from './ollama-lib.mjs';

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

const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;
const LOCAL_TUNNEL_PORT = 15588;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

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
  });
}

async function fetchPexelsImage(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    const d = await r.json();
    const photos = d.photos || [];
    if (!photos.length) return null;
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return photo.src?.large || photo.src?.original || null;
  } catch { return null; }
}

async function downloadImage(url, destPath) {
  try {
    const r = await fetch(url);
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    return true;
  } catch { return false; }
}

const SITES = [
  {
    slug: 'sanliurfa-kalesi',
    name: 'Şanlıurfa Kalesi',
    period: 'Antik Dönem - Ortaçağ',
    lat: 37.1611, lon: 38.7928,
    location: 'Eyyübiye, Şanlıurfa',
    is_unesco: false, is_featured: true,
    tags: ['kale', 'antik', 'tarihi', 'manzara', 'eyyübiye'],
    visiting_hours: '08:00-19:00',
    entrance_fee: 'Ücretsiz',
    pexels: 'ancient citadel castle ruins turkey',
  },
  {
    slug: 'kasri-benat-sutunlar',
    name: 'Kasr-ı Benat (Nimrod Sütunları)',
    period: 'Roma / Geç Antik Dönem',
    lat: 37.1600, lon: 38.7905,
    location: 'Şanlıurfa Kalesi üzeri, Eyyübiye',
    is_unesco: false, is_featured: true,
    tags: ['antik', 'roma', 'sütunlar', 'simge', 'eyyübiye'],
    visiting_hours: '08:00-19:00',
    entrance_fee: 'Ücretsiz',
    pexels: 'ancient roman columns ruins turkey',
  },
  {
    slug: 'sogmatar-antik-kenti',
    name: 'Soğmatar Antik Kenti',
    period: 'Hellenistik - Roma Dönemi (M.Ö. 3. yy – M.S. 3. yy)',
    lat: 36.9567, lon: 38.5328,
    location: 'Yardımcı köyü, Halfeti ilçesi',
    is_unesco: false, is_featured: false,
    tags: ['antik', 'gizem', 'arkeoloji', 'ay tapınağı', 'halfeti'],
    visiting_hours: 'Her zaman açık',
    entrance_fee: 'Ücretsiz',
    pexels: 'ancient ruins mystery stone carving',
  },
  {
    slug: 'gumruk-hani',
    name: 'Gümrük Hanı',
    period: 'Osmanlı Dönemi (17. yy)',
    lat: 37.1580, lon: 38.7945,
    location: 'Kapalı Çarşı, Eyyübiye, Şanlıurfa',
    is_unesco: false, is_featured: false,
    tags: ['osmanlı', 'han', 'çarşı', 'tarihi', 'eyyübiye'],
    visiting_hours: '08:00-20:00',
    entrance_fee: 'Ücretsiz',
    pexels: 'ottoman caravanserai bazaar historic architecture',
  },
  {
    slug: 'harran-kubbeli-evler',
    name: "Harran'ın Kümbetleri (Petek Evler)",
    period: 'Ortaçağ - Günümüz (3000+ yıllık gelenek)',
    lat: 36.8647, lon: 39.0291,
    location: 'Harran ilçe merkezi, Şanlıurfa',
    is_unesco: false, is_featured: true,
    tags: ['harran', 'mimari', 'geleneksel', 'köy', 'kümbet evler'],
    visiting_hours: 'Her zaman açık',
    entrance_fee: 'Ücretsiz',
    pexels: 'traditional beehive dome houses mud brick village',
  },
  {
    slug: 'birecik-kalesi',
    name: 'Birecik Kalesi',
    period: 'Bizans - Haçlı - Memluk Dönemi',
    lat: 37.0322, lon: 37.9792,
    location: 'Birecik ilçe merkezi, Şanlıurfa',
    is_unesco: false, is_featured: false,
    tags: ['kale', 'birecik', 'bizans', 'haçlı', 'fırat'],
    visiting_hours: '09:00-17:00',
    entrance_fee: 'Ücretsiz',
    pexels: 'medieval castle fortress river ruins',
  },
  {
    slug: 'rizvaniye-kulliyesi',
    name: 'Rızvaniye Külliyesi ve Halilürrahman Camii',
    period: 'Osmanlı Dönemi (1716)',
    lat: 37.1565, lon: 38.7932,
    location: 'Balıklıgöl çevresi, Eyyübiye',
    is_unesco: false, is_featured: false,
    tags: ['osmanlı', 'cami', 'külliye', 'balıklıgöl', 'dini'],
    visiting_hours: '05:00-22:00',
    entrance_fee: 'Ücretsiz',
    pexels: 'ottoman mosque historic architecture courtyard',
  },
  {
    slug: 'selahaddin-eyyubi-camii',
    name: 'Selahaddin Eyyubi Camii',
    period: 'Eyyubi Dönemi (12. yy)',
    lat: 37.1598, lon: 38.7940,
    location: 'Eyyübiye, Şanlıurfa',
    is_unesco: false, is_featured: false,
    tags: ['eyyubi', 'cami', 'ortaçağ', 'dini', 'eyyübiye'],
    visiting_hours: '05:00-22:00',
    entrance_fee: 'Ücretsiz',
    pexels: 'ayyubid mosque historic stone minaret',
  },
];

async function generateContent(site) {
  const [desc, shortDesc, history, significance, tips] = await Promise.all([
    ollamaChat([
      { role: 'system', content: SYSTEM_TR },
      { role: 'user', content: `Şanlıurfa'daki "${site.name}" (${site.period}) için kapsamlı açıklama yaz. 400-550 karakter, 3-4 cümle. Tarihçe + mimari + neden önemli. Türkçe, akıcı. Sadece açıklamayı yaz.` },
    ]),
    ollamaChat([
      { role: 'system', content: SYSTEM_TR },
      { role: 'user', content: `"${site.name}" için kısa açıklama: 100-150 karakter, 1 etkileyici cümle. Sadece metni yaz.` },
    ]),
    ollamaChat([
      { role: 'system', content: SYSTEM_TR },
      { role: 'user', content: `"${site.name}" (${site.period}) için tarihçe. 300-400 karakter, 2-3 cümle. Kronolojik bilgi, önemli dönemler. Sadece metni yaz.` },
    ]),
    ollamaChat([
      { role: 'system', content: SYSTEM_TR },
      { role: 'user', content: `"${site.name}"'nin tarihi önemi nedir? 200-300 karakter, 1-2 cümle. Akademik veya kültürel değer. Sadece metni yaz.` },
    ]),
    ollamaChat([
      { role: 'system', content: SYSTEM_TR },
      { role: 'user', content: `"${site.name}" ziyaretçi ipuçları. 3 madde, her biri tek cümle. Ulaşım, en iyi ziyaret zamanı, dikkat edilecek şeyler. Madde işareti kullanma.` },
    ]),
  ]);

  const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    description: clean(desc).slice(0, 600),
    short_description: clean(shortDesc).slice(0, 180),
    history: clean(history).slice(0, 500),
    significance: clean(significance).slice(0, 350),
    tips: clean(tips).slice(0, 400),
  };
}

async function main() {
  console.log('\n🏛️  Tarihi Yer Batch — 8 yeni yer\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: existing } = await client.query('SELECT slug FROM app.historical_sites');
  const existingSlugs = new Set(existing.map(r => r.slug));

  const toInsert = SITES.filter(s => !existingSlugs.has(s.slug));
  console.log(`📋 ${toInsert.length} yeni tarihi yer eklenecek\n`);

  let ok = 0, fail = 0;

  for (const site of toInsert) {
    process.stdout.write(`  → ${site.name}... `);

    try {
      const content = await generateContent(site);

      if (content.description.length < 200) {
        console.log(`✗ açıklama kısa (${content.description.length}c)`);
        fail++;
        await sleep(2000);
        continue;
      }

      // Görsel
      let coverImage = `/uploads/historical/${site.slug}.jpg`;
      const imgUrl = await fetchPexelsImage(site.pexels);
      if (imgUrl) {
        const destPath = path.join(projectRoot, 'public', 'uploads', 'historical', `${site.slug}.jpg`);
        const saved = await downloadImage(imgUrl, destPath);
        if (!saved) coverImage = '/uploads/historical/default.jpg';
      }

      await client.query(`
        INSERT INTO app.historical_sites
          (slug, name, title, description, short_description, history, significance,
           location, latitude, longitude, cover_image, images,
           visiting_hours, entrance_fee, tips, tags, is_unesco, period, is_featured, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active')
        ON CONFLICT (slug) DO NOTHING
      `, [
        site.slug, site.name,
        site.name + ' | Şanlıurfa Tarihi Yerler',
        content.description, content.short_description,
        content.history, content.significance,
        site.location, site.lat, site.lon,
        coverImage, [coverImage],
        site.visiting_hours, site.entrance_fee,
        content.tips, site.tags,
        site.is_unesco, site.period, site.is_featured,
      ]);

      console.log(`✓ ${content.description.length}c`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(1500);
  }

  const { rows: [stats] } = await client.query('SELECT COUNT(*) AS total FROM app.historical_sites');

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} eklendi | ${fail} başarısız`);
  console.log(`📊 Toplam tarihi yer: ${stats.total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
