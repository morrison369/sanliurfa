#!/usr/bin/env node
/**
 * 1. 305 mekan için kategori bazlı opening_hours atar
 * 2. 18 ilçesiz mekanı adres bazlı ilçeye atar
 */
import fs from 'node:fs';
import path from 'node:path';
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

const LOCAL_TUNNEL_PORT = 15574;

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
      ssh.on('ready', () => resolve({ ssh, server })).connect({
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

// Kategori anahtar kelimelerine göre saat şablonları
function getHoursByCategory(catName) {
  const c = catName.toLowerCase();

  const ALL_DAY = '00:00-23:59';
  const EVERY_DAY = (h) => ({ mon: h, tue: h, wed: h, thu: h, fri: h, sat: h, sun: h });
  const WEEK_ONLY = (h) => ({ mon: h, tue: h, wed: h, thu: h, fri: h });
  const WEEK_SAT  = (h, sh) => ({ mon: h, tue: h, wed: h, thu: h, fri: h, sat: sh });

  // 24 saat / her gün
  if (/otel|hotel|apart|pansiyon|konaklama|bungalov|hostel|kamp/i.test(c))
    return EVERY_DAY(ALL_DAY);

  // Cami / dini mekânlar
  if (/cami|mosque|türbe|türbesi|ziyaret|dini/i.test(c))
    return EVERY_DAY('05:00-22:00');

  // Hastane / klinik / sağlık merkezi
  if (/hastane|klinik|sağlık|poliklinik|acil/i.test(c))
    return EVERY_DAY(ALL_DAY);

  // Eczane
  if (/eczane|pharmac/i.test(c))
    return { ...WEEK_SAT('08:00-20:00', '09:00-19:00'), sun: '09:00-14:00' };

  // Restoran / yeme-içme / kebapçı / ciğerci / büfe
  if (/restoran|restaurant|kebap|ciğer|büfe|lahmacun|pide|döner|steakhouse|mangal|izgara|sofrası|evi$/i.test(c))
    return EVERY_DAY('11:00-23:00');

  // Fast food / burger / pizza
  if (/fast|burger|pizza|sandviç/i.test(c))
    return EVERY_DAY('10:00-22:00');

  // Kafe / pastane / çay / kahve / tatlı
  if (/kafe|cafe|pastane|çay|kahve|tatlı|baklava|kadayıf|dondurma|muhallebi|katmer/i.test(c))
    return EVERY_DAY('08:00-22:00');

  // Fırın / ekmek
  if (/fırın|ekmek|pide fırını/i.test(c))
    return { ...WEEK_SAT('06:00-20:00', '06:00-18:00'), sun: '07:00-13:00' };

  // Müze / tarihi yer / ören yeri
  if (/müze|museum|ören|arkeolo|tarihi|mağara/i.test(c))
    return { mon: null, tue: '09:00-17:00', wed: '09:00-17:00', thu: '09:00-17:00', fri: '09:00-17:00', sat: '09:00-18:00', sun: '09:00-18:00' };

  // Park / rekreasyon / piknik / tabiat
  if (/park|piknik|rekreasyon|tabiat|doğa|bahçe|mesire/i.test(c))
    return EVERY_DAY('07:00-22:00');

  // Turizm / tur / gezi
  if (/turizm|tur |gezi|rehber|seyahat/i.test(c))
    return { ...WEEK_SAT('08:00-18:00', '08:00-18:00'), sun: '09:00-17:00' };

  // Resmi kurumlar / devlet / belediye
  if (/kaymakamlık|valilik|belediye|ptt|nüfus|vergi|sgk|işkur|noter|resmi|devlet|müdürlüğü|dairesi/i.test(c))
    return WEEK_ONLY('08:00-17:00');

  // Banka / atm / finans
  if (/banka|bank|finans|sigorta|kredi/i.test(c))
    return WEEK_ONLY('09:00-17:30');

  // Araç kiralama / transfer
  if (/araç kiralama|rent a car|transfer|taksi/i.test(c))
    return EVERY_DAY('07:00-22:00');

  // Otopark
  if (/otopark|park yeri/i.test(c))
    return EVERY_DAY('07:00-23:00');

  // Alışveriş / market / mağaza / AVM
  if (/market|süpermarket|avm|alışveriş/i.test(c))
    return EVERY_DAY('09:00-21:00');

  // Kuyumcu
  if (/kuyumcu|altın|mücevher|bijuteri/i.test(c))
    return { ...WEEK_SAT('09:00-19:00', '09:00-18:00') };

  // Mobilya / dekorasyon / halı
  if (/mobilya|dekorasyon|halı|perde|ev eşyası/i.test(c))
    return { ...WEEK_SAT('09:00-19:00', '09:00-18:00'), sun: '10:00-17:00' };

  // Spor / fitness / halı saha / yüzme
  if (/spor|fitness|halı saha|gym|yüzme|havuz/i.test(c))
    return EVERY_DAY('08:00-23:00');

  // Çiçekçi
  if (/çiçek/i.test(c))
    return { ...WEEK_SAT('08:00-21:00', '08:00-20:00'), sun: '09:00-16:00' };

  // Medrese / eğitim
  if (/medrese|okul|eğitim|üniversite|dershane/i.test(c))
    return WEEK_ONLY('08:00-17:00');

  // Sağlık merkezi / diş / göz
  if (/diş|göz|optik|veteriner/i.test(c))
    return { ...WEEK_SAT('09:00-18:00', '09:00-14:00') };

  // Otomotiv / oto servis / kaporta
  if (/oto|araç|servis|kaporta|lastik|yıkama/i.test(c))
    return { ...WEEK_SAT('08:00-18:00', '08:00-16:00') };

  // Bürolar / ofis / emlak
  if (/büro|ofis|emlak|danışmanlık|muhasebe|avukat|hukuk/i.test(c))
    return WEEK_ONLY('09:00-18:00');

  // Tarım / hayvancılık
  if (/tarım|hayvancılık|veteriner/i.test(c))
    return { ...WEEK_SAT('08:00-18:00', '08:00-14:00') };

  // Medya / iletişim / basın
  if (/medya|gazete|tv|radyo|basın/i.test(c))
    return WEEK_ONLY('09:00-18:00');

  // Varsayılan (bilinmeyen kategori)
  return { ...WEEK_SAT('09:00-19:00', '09:00-17:00'), sun: '10:00-16:00' };
}

function toJsonHours(h) {
  const result = {};
  for (const [day, val] of Object.entries(h)) {
    if (val) result[day] = val;
  }
  return JSON.stringify(result);
}

async function main() {
  console.log('\n🕐 Opening hours + ilçe atama başlıyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  // ── 1. DISTRICT FIX ──────────────────────────────────
  console.log('📍 İlçe ataması...');
  const { rows: districts } = await client.query('SELECT id, name, slug FROM app.districts');

  // Adres anahtar kelimelerinden ilçe eşleme
  const districtMap = [
    { keywords: ['eyyübiye', 'kapalı çarşı', 'divan', 'balıklıgöl', 'urfa merkez'], name: 'Eyyübiye' },
    { keywords: ['haliliye', 'harran caddesi', 'hacıbaba', 'göbeklitepe yolu', 'devlet hastanesi'], name: 'Haliliye' },
    { keywords: ['karaköprü'], name: 'Karaköprü' },
    { keywords: ['halfeti', 'halfeti sahil', 'halfeti iskele', 'halfeti köprü'], name: 'Halfeti' },
    { keywords: ['harran ilçe', 'harran ovası', 'harran karayolu'], name: 'Harran' },
    { keywords: ['birecik'], name: 'Birecik' },
    { keywords: ['siverek'], name: 'Siverek' },
    { keywords: ['viranşehir', 'karaharabe'], name: 'Viranşehir' },
    { keywords: ['bozova'], name: 'Bozova' },
    { keywords: ['ceylanpınar'], name: 'Ceylanpınar' },
  ];

  const { rows: noDistrict } = await client.query(
    `SELECT p.id, p.name, p.address FROM app.places p WHERE p.status='active' AND p.district_id IS NULL`
  );

  let districtFixed = 0;
  for (const place of noDistrict) {
    const addr = (place.address || '').toLowerCase();
    let matched = null;
    for (const { keywords, name } of districtMap) {
      if (keywords.some(kw => addr.includes(kw.toLowerCase()))) {
        matched = name;
        break;
      }
    }
    if (!matched) {
      // Eyyübiye default (Şanlıurfa merkezi yerler)
      if (addr.includes('şanlıurfa') || addr.includes('urfa')) matched = 'Eyyübiye';
    }
    if (matched) {
      const district = districts.find(d => d.name === matched);
      if (district) {
        await client.query(`UPDATE app.places SET district_id=$1 WHERE id=$2`, [district.id, place.id]);
        districtFixed++;
      }
    }
  }
  console.log(`  ✅ ${districtFixed}/${noDistrict.length} mekan ilçeye atandı\n`);

  // ── 2. OPENING HOURS ─────────────────────────────────
  console.log('🕐 Opening hours atama...');
  const { rows: places } = await client.query(`
    SELECT p.id, p.name, c.name AS cat_name
    FROM app.places p
    JOIN app.categories c ON c.id = p.category_id
    WHERE p.status='active' AND (p.opening_hours IS NULL OR p.opening_hours='')
    ORDER BY c.name, p.name
  `);

  console.log(`  ${places.length} mekan işlenecek`);

  // Batch UPDATE
  let updated = 0;
  const byCategory = {};
  for (const p of places) {
    const hours = getHoursByCategory(p.cat_name);
    const json = toJsonHours(hours);
    const key = json;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(p.id);
  }

  for (const [json, ids] of Object.entries(byCategory)) {
    await client.query(
      `UPDATE app.places SET opening_hours=$1 WHERE id=ANY($2)`,
      [json, ids]
    );
    updated += ids.length;
  }

  console.log(`  ✅ ${updated} mekan için opening_hours güncellendi\n`);

  // Final check
  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER(WHERE status='active') AS total,
      COUNT(*) FILTER(WHERE status='active' AND (opening_hours IS NULL OR opening_hours='')) AS no_hours,
      COUNT(*) FILTER(WHERE status='active' AND district_id IS NULL) AS no_district
    FROM app.places
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`📊 Mekan: ${stats.total} | Saatsiz: ${stats.no_hours} | İlçesiz: ${stats.no_district}`);
}

main().catch(e => { console.error(e); process.exit(1); });
