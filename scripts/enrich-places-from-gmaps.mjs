#!/usr/bin/env node
/**
 * Google Maps Scraper → Mekan Zenginleştirme
 *
 * places tablosunu phone/website/opening_hours/price_range ile günceller.
 *
 * KURULUM (tek seferlik):
 *   1. https://github.com/gosom/google-maps-scraper/releases adresinden
 *      windows_amd64.zip'i indir
 *   2. İçindeki .exe'yi scripts/google-maps-scraper.exe olarak kaydet
 *
 * KULLANIM:
 *   # 1. Scraper'ı çalıştır (binary gerekli):
 *   node scripts/enrich-places-from-gmaps.mjs --scrape
 *
 *   # 2. Mevcut JSON dosyasından işle:
 *   node scripts/enrich-places-from-gmaps.mjs --input scripts/gmaps-results.json
 *
 *   # 3. Kuru çalıştırma — SQL'i göster, uygulama:
 *   node scripts/enrich-places-from-gmaps.mjs --input scripts/gmaps-results.json --dry-run
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { Client } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';

const scriptDir = dirname(fileURLToPath(import.meta.url));

// ─── env yükle ───────────────────────────────────────────────────────────────
const envFile = resolve(scriptDir, '.env.scripts');
function loadEnv(f) {
  if (!existsSync(f)) return;
  for (const raw of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(envFile);

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '22');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const DB_URL   = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;

// ─── argümanlar ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const DO_SCRAPE  = args.includes('--scrape');
const DO_IMAGES  = args.includes('--images');
const inputIdx   = args.indexOf('--input');
const INPUT_FILE = inputIdx >= 0 ? args[inputIdx + 1] : null;

// ─── bilinen mekanlar (slug → görünen ad) ────────────────────────────────────
const KNOWN_PLACES = {
  'cigerci-aziz-usta':            'Ciğerci Aziz Usta',
  'sembol-ocakbasi':              'Sembol Ocakbaşı',
  'culcuoglu-restoran':           'Çulcuoğlu Restoran',
  'guven-kebap':                  'Güven Kebap',
  'halil-ibrahim-sofrasi':        'Halil İbrahim Sofrası',
  'divan-otel-sanliurfa':         'Divan Otel Şanlıurfa',
  'harran-otel-sanliurfa':        'Harran Otel Şanlıurfa',
  'doubletree-hilton-sanliurfa':  'DoubleTree by Hilton Şanlıurfa',
  'guven-hotel-sanliurfa':        'Güven Hotel',
  'nomad-hotel-sanliurfa':        'Nomad Hotel',
  'balikligol-kahvalti-salonu':   'Balıklıgöl Kahvaltı Salonu',
  'tas-kahve-sanliurfa':          'Taş Kahve',
  'urfa-evi-restoran':            'Urfa Evi',
  'gobeklitepe-arkeoloji-muzesi': 'Göbeklitepe Arkeoloji Müzesi',
  'sanliurfa-muzesi':             'Şanlıurfa Müzesi',
  'halfeti-tekne-turu':           'Halfeti Tekne Turu',
  'harran-antik-kent':            'Harran Antik Kent',
  'piazza-sanliurfa-avm':         'Piazza AVM Şanlıurfa',
  'sanliurfa-kapalicarsi':        'Kapalıçarşı',
  'bakırcilar-carsisi-sanliurfa': 'Bakırcılar Çarşısı',
  'harran-universitesi':          'Harran Üniversitesi',
  'sira-gecesi-kultur-evi':       'Sıra Gecesi Kültür Evi',
  'ziraat-bankasi-merkez':        'Ziraat Bankası Merkez',
  'garanti-bbva-sanliurfa':       'Garanti BBVA',
  'toyota-galerisi-sanliurfa':    'Toyota Galerisi',
};

// ─── yardımcı fonksiyonlar ────────────────────────────────────────────────────

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '));
  const common = [...wa].filter(w => wb.has(w) && w.length > 2).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? common / union : 0;
}

function findBestMatch(scraped, knownPlaces, threshold = 0.55) {
  let best = null, bestScore = 0;
  for (const [slug, name] of Object.entries(knownPlaces)) {
    const score = similarity(scraped.title || scraped.name || '', name);
    if (score > bestScore) { bestScore = score; best = slug; }
  }
  return bestScore >= threshold ? { slug: best, score: bestScore } : null;
}

const DAY_MAP = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed',
  thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun',
  pazartesi: 'mon', sali: 'tue', carsamba: 'wed',
  persembe: 'thu', cuma: 'fri', cumartesi: 'sat', pazar: 'sun',
};

function parseTime(t) {
  t = (t || '').trim();
  const ampm = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1]), m = ampm[2], period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const plain = t.match(/^(\d{1,2})[.:](\d{2})$/);
  if (plain) return `${String(parseInt(plain[1])).padStart(2, '0')}:${plain[2]}`;
  return null;
}

function convertHours(hours) {
  if (!hours || typeof hours !== 'object') return null;
  const result = {};
  for (const [rawDay, rawRange] of Object.entries(hours)) {
    const key = DAY_MAP[normalize(rawDay)];
    if (!key) continue;
    const range = String(rawRange || '');
    const parts = range.split(/\s*[–\-]\s*/);
    if (parts.length === 2) {
      const open = parseTime(parts[0]), close = parseTime(parts[1]);
      if (open && close) result[key] = `${open}-${close}`;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function convertPrice(price) {
  if (!price) return null;
  const map = { '$': '₺', '$$': '₺₺', '$$$': '₺₺₺', '$$$$': '₺₺₺₺' };
  const p = price.trim();
  return map[p] || (p.startsWith('₺') ? p : null);
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`;
  return phone;
}

function escapeSql(val) {
  return `'${String(val).replace(/'/g, "''")}'`;
}

function downloadBuffer(url) {
  return new Promise((res, rej) => {
    if (!url || !url.startsWith('http')) return rej(new Error(`Geçersiz URL: ${url}`));
    const req = url.startsWith('https') ? httpsRequest : httpRequest;
    const chunks = [];
    const get = (targetUrl, depth = 0) => {
      if (depth > 4) return rej(new Error('Yönlendirme döngüsü'));
      req(targetUrl, r => {
        if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location) {
          return get(r.headers.location, depth + 1);
        }
        if (r.statusCode !== 200) return rej(new Error(`HTTP ${r.statusCode}`));
        r.on('data', d => chunks.push(d));
        r.on('end', () => res(Buffer.concat(chunks)));
        r.on('error', rej);
      }).on('error', rej).end();
    };
    get(url);
  });
}

function pickImageUrl(item) {
  // images[] dizisinde genellikle daha büyük görseller olur
  const imgs = item.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === 'string' && first.startsWith('http')) return first;
    if (first && typeof first.url === 'string') return first.url;
    if (first && typeof first.src === 'string') return first.src;
  }
  if (typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) return item.thumbnail;
  return null;
}

// ─── SSH yardımcısı ───────────────────────────────────────────────────────────

function runRemoteCommand(connection, command) {
  return new Promise((res, rej) => {
    connection.exec(command, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('data', d => { out += d; });
      stream.stderr.on('data', d => { out += d; });
      stream.on('close', code => {
        if (code !== 0) return rej(new Error(`exit ${code}: ${out.trim()}`));
        res(out.trim());
      });
    });
  });
}

function sshConnect() {
  return new Promise((res, rej) => {
    const connection = new Client();
    connection.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    connection.on('ready', () => res(connection));
    connection.on('error', rej);
  });
}

// ─── binary çalıştır ─────────────────────────────────────────────────────────

function runScraper() {
  const binaryPath = resolve(scriptDir, 'google-maps-scraper.exe');
  const fallback   = resolve(scriptDir, 'google-maps-scraper');
  const binary = existsSync(binaryPath) ? binaryPath
               : existsSync(fallback)   ? fallback
               : null;

  if (!binary) {
    console.error('\n  Binary bulunamadı!');
    console.error('  https://github.com/gosom/google-maps-scraper/releases');
    console.error('  → windows_amd64.zip indir → scripts/google-maps-scraper.exe olarak kaydet\n');
    process.exit(1);
  }

  const queriesFile = resolve(scriptDir, 'gmaps-queries.txt');
  const outputFile  = resolve(scriptDir, 'gmaps-results.json');

  console.log(`Scraper çalıştırılıyor...`);
  const result = spawnSync(binary, [
    '-input', queriesFile,
    '-output', outputFile,
    '-results-per-query', '5',
    '-lang', 'tr',
    '-exit-on-inactivity', '2m',
    '-produce',
  ], { stdio: 'inherit', windowsHide: false });

  if (result.status !== 0) {
    console.error('Scraper hatası:', result.error?.message || `exit ${result.status}`);
    process.exit(1);
  }

  return outputFile;
}

// ─── ana fonksiyon ────────────────────────────────────────────────────────────

async function main() {
  let resultsFile = INPUT_FILE;

  if (DO_SCRAPE) resultsFile = runScraper();

  if (!resultsFile) {
    console.log('Kullanım:\n');
    console.log('  node scripts/enrich-places-from-gmaps.mjs --scrape');
    console.log('  node scripts/enrich-places-from-gmaps.mjs --input scripts/gmaps-results.json');
    console.log('  node scripts/enrich-places-from-gmaps.mjs --input results.json --dry-run\n');
    process.exit(0);
  }

  if (!existsSync(resultsFile)) {
    console.error(`Dosya bulunamadı: ${resultsFile}`);
    process.exit(1);
  }

  const raw = readFileSync(resultsFile, 'utf8').trim();
  let results;
  try {
    results = JSON.parse(raw);
    if (!Array.isArray(results)) results = [results];
  } catch {
    results = raw.split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  }

  console.log(`\n${results.length} scraper sonucu yüklendi.`);

  const updates = [];
  const imageItems = []; // { slug, url }

  for (const item of results) {
    const match = findBestMatch(item, KNOWN_PLACES);
    if (!match) continue;

    const { slug, score } = match;
    const setParts = [];

    const phone   = formatPhone(item.phone);
    const website = item.web_site || item.website || null;
    const hours   = convertHours(item.open_hours || item.hours || null);
    const price   = convertPrice(item.price || item.price_range || null);

    if (phone)   setParts.push(`phone = ${escapeSql(phone)}`);
    if (website) setParts.push(`website = ${escapeSql(website)}`);
    if (hours)   setParts.push(`opening_hours = ${escapeSql(JSON.stringify(hours))}`);
    if (price)   setParts.push(`price_range = ${escapeSql(price)}`);

    if (setParts.length > 0) {
      updates.push({ slug, score: score.toFixed(2), setParts, name: KNOWN_PLACES[slug] });
    }

    if (DO_IMAGES) {
      const imgUrl = pickImageUrl(item);
      if (imgUrl) imageItems.push({ slug, url: imgUrl, name: KNOWN_PLACES[slug] });
    }
  }

  if (updates.length === 0 && imageItems.length === 0) {
    console.log('Eşleşen mekan veya güncellenecek alan bulunamadı.');
    return;
  }

  console.log(`\n${updates.length} mekan güncellenecek:\n`);

  const sqlLines = ['BEGIN;'];
  for (const u of updates) {
    const cols = u.setParts.map(s => s.split(' =')[0]).join(', ');
    console.log(`  ✓ [eşleşme:${u.score}] ${u.name} → ${cols}`);
    sqlLines.push(
      `UPDATE places SET ${u.setParts.join(', ')}, updated_at = NOW() WHERE slug = ${escapeSql(u.slug)};`
    );
  }
  sqlLines.push('COMMIT;');

  const sql = sqlLines.join('\n');

  if (DRY_RUN) {
    if (sql) {
      console.log('\n─── SQL (--dry-run) ───\n');
      console.log(sql);
    }
    if (imageItems.length > 0) {
      console.log('\n─── Görsel listesi (--dry-run) ───');
      for (const im of imageItems) console.log(`  ${im.slug}: ${im.url}`);
    }
    return;
  }

  // ─── DB güncelle ───────────────────────────────────────────────────────────
  if (updates.length > 0) {
    if (!DB_URL) {
      console.error('\nDB_URL bulunamadı (.env.scripts içinde DATABASE_URL veya PROD_DATABASE_URL gerekli)');
      console.log('\nSQL\'i elle uygulamak için:\n' + sql);
    } else {
      console.log('\nSSH (DB) bağlantısı kuruluyor...');
      const connection = await sshConnect();
      try {
        const psqlCmd = `psql "${DB_URL}" -c ${JSON.stringify(sql.replace(/\n/g, ' '))} 2>&1`;
        const out = await runRemoteCommand(connection, psqlCmd);
        console.log(`DB: ${out}`);
        console.log(`✓ ${updates.length} mekan güncellendi.`);
      } finally {
        connection.end();
      }
    }
  }

  // ─── Görselleri indir ve yükle ─────────────────────────────────────────────
  if (DO_IMAGES && imageItems.length > 0) {
    const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
    const remotePub  = `${REMOTE_DIR}/public/uploads/places`;
    const remoteDist = `${REMOTE_DIR}/dist/client/uploads/places`;

    console.log(`\nGörsel SFTP yükleme: ${imageItems.length} mekan...`);
    const sftp = new SftpClient();
    await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    try { await sftp.mkdir(remotePub, true); } catch {}
    try { await sftp.mkdir(remoteDist, true); } catch {}

    let imgOk = 0, imgFail = 0;
    for (const { slug, url, name } of imageItems) {
      process.stdout.write(`  [görsel] ${name}... `);
      try {
        const buf = await downloadBuffer(url);
        await sftp.put(buf, `${remotePub}/${slug}.jpg`);
        await sftp.put(buf, `${remoteDist}/${slug}.jpg`);
        console.log(`✓ (${(buf.length / 1024).toFixed(0)} KB)`);
        imgOk++;
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.log(`✗ ${e.message}`);
        imgFail++;
      }
    }
    await sftp.end();
    console.log(`\n✓ Görsel: ${imgOk} yüklendi, ${imgFail} başarısız.`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
