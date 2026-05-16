#!/usr/bin/env node
/**
 * Google Maps Scraper → Mekan Zenginleştirme
 *
 * places tablosunu Google Maps verisiyle zenginleştirir.
 * Shared hosting modeli: Go binary ayrı kurulur, Node.js bu binary'yi subprocess olarak çağırır.
 *
 * KURULUM (tek seferlik):
 *   1. https://github.com/gosom/google-maps-scraper/releases adresinden
 *      windows_amd64.zip'i indir veya prod Linux'ta npm run gmaps:prod:install çalıştır
 *   2. Binary konumu:
 *      Windows: D:\sanliurfa.com\tools\google-maps-scraper.exe
 *      Prod Linux: $HOME/tools/google-maps-scraper
 *
 * KULLANIM:
 *   # 1. Scraper'ı çalıştır (binary gerekli):
 *   node scripts/enrich-places-from-gmaps.mjs --scrape
 *   node scripts/enrich-places-from-gmaps.mjs --scrape --images --email --extra-reviews --depth=1 --concurrency=1
 *
 *   # 2. Mevcut JSON dosyasından işle:
 *   node scripts/enrich-places-from-gmaps.mjs --input scripts/gmaps-results.json
 *
 *   # 3. Kuru çalıştırma — SQL'i göster, uygulama:
 *   node scripts/enrich-places-from-gmaps.mjs --input scripts/gmaps-results.json --dry-run
 *
 * Upstream gosom/google-maps-scraper güncel CLI:
 *   -results output.json -json -depth N -c N -email -extra-reviews -fast-mode
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { Client } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';
import { runGoogleMapsScraper } from './lib/google-maps-scraper-runner.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const workspaceRoot = resolve(projectRoot, '..');

// ─── env yükle ───────────────────────────────────────────────────────────────
const envFile = resolve(scriptDir, '.env.scripts');
function loadEnv(f) {
  if (!existsSync(f)) return;
  for (const raw of readFileSync(f, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
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
const DO_EMAIL    = args.includes('--email');
const DO_REVIEWS  = args.includes('--extra-reviews');
const FAST_MODE   = args.includes('--fast-mode');
const inputIdx   = args.indexOf('--input');
const INPUT_FILE = inputIdx >= 0 ? args[inputIdx + 1] : null;
const argValue = (name, fallback = null) => {
  const direct = args.find(a => a.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
};
const SCRAPE_DEPTH = argValue('--depth', process.env.GMAPS_DEPTH || '1');
const SCRAPE_CONCURRENCY = argValue('--concurrency', process.env.GMAPS_CONCURRENCY || '1');
const SCRAPE_GEO = argValue('--geo', process.env.GMAPS_GEO || '');
const SCRAPE_RADIUS = argValue('--radius', process.env.GMAPS_RADIUS || '');
const SCRAPE_PROXIES = argValue('--proxies', process.env.GMAPS_PROXIES || '');

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
  const inputId = String(scraped.input_id || '').trim();
  if (inputId && Object.prototype.hasOwnProperty.call(knownPlaces, inputId)) {
    return { slug: inputId, score: 1 };
  }

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

function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function asInt(value) {
  const n = asNumber(value);
  return n === null ? null : Math.max(0, Math.round(n));
}

function pickDescription(item) {
  if (typeof item.descriptions === 'string' && item.descriptions.trim()) return item.descriptions.trim();
  if (Array.isArray(item.descriptions) && item.descriptions.length > 0) {
    return item.descriptions.map(String).join(' ').trim();
  }
  if (typeof item.about === 'string' && item.about.trim()) return item.about.trim();
  if (item.about && typeof item.about === 'object') {
    return Object.values(item.about).flat().map(String).join(', ').trim();
  }
  return null;
}

function pickGooglePlaceId(item) {
  return item.place_id || item.data_id || item.cid || null;
}

function pickGoogleMapsUrl(item) {
  return item.link || item.url || item.google_maps_url || item.maps_url || null;
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

function pickImageUrls(item, limit = 6) {
  const urls = [];
  const add = (value) => {
    if (typeof value === 'string' && value.startsWith('http') && !urls.includes(value)) urls.push(value);
    if (value && typeof value.url === 'string') add(value.url);
    if (value && typeof value.src === 'string') add(value.src);
  };
  if (Array.isArray(item.images)) item.images.forEach(add);
  add(item.thumbnail);
  return urls.slice(0, limit);
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

async function runSql(sql) {
  if (!DB_URL) {
    return { ok: false, mode: 'missing-db-url', output: '' };
  }

  const localPsql = spawnSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
    timeout: 60000,
    windowsHide: true,
  });

  if (localPsql.status === 0) {
    return {
      ok: true,
      mode: 'local-psql',
      output: `${localPsql.stdout || ''}${localPsql.stderr || ''}`.trim(),
    };
  }

  try {
    const client = new pg.Client({
      connectionString: DB_URL,
      connectionTimeoutMillis: 10000,
      application_name: 'sanliurfa-gmaps-enrich',
    });
    await client.connect();
    try {
      await client.query(sql);
      return { ok: true, mode: 'pg-driver', output: 'SQL uygulandı.' };
    } finally {
      await client.end();
    }
  } catch (localError) {
    const hasSsh = SSH_HOST && SSH_USER && SSH_PASS;
    if (!hasSsh) {
      return {
        ok: false,
        mode: 'local-failed',
        output: `${localPsql.stderr || localPsql.error?.message || ''}\n${localError.message}`.trim(),
      };
    }

    const connection = await sshConnect();
    try {
      const psqlCmd = `psql "${DB_URL}" -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql.replace(/\n/g, ' '))} 2>&1`;
      const output = await runRemoteCommand(connection, psqlCmd);
      return { ok: true, mode: 'ssh-psql', output };
    } finally {
      connection.end();
    }
  }
}

// ─── binary çalıştır ─────────────────────────────────────────────────────────

function runScraper() {
  const queriesFile = resolve(scriptDir, 'gmaps-queries.txt');
  const outputFile  = resolve(scriptDir, 'gmaps-results.json');

  console.log(`Scraper çalıştırılıyor...`);
  try {
    runGoogleMapsScraper({
      projectRoot,
      workspaceRoot,
      input: queriesFile,
      results: outputFile,
      lang: 'tr',
      depth: SCRAPE_DEPTH,
      concurrency: SCRAPE_CONCURRENCY,
      email: DO_EMAIL,
      extraReviews: DO_REVIEWS,
      fastMode: FAST_MODE,
      geo: SCRAPE_GEO,
      radius: SCRAPE_RADIUS,
      proxies: SCRAPE_PROXIES,
    });
  } catch (error) {
    console.error(`Scraper hatası: ${error.message}`);
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

  if (DO_SCRAPE && results.length === 0) {
    console.error(
      'Scraper 0 sonuç döndürdü. Google/Playwright tarafında hata, blok veya boş çıktı olabilir; DB güncellemesi yapılmadı.',
    );
    process.exit(1);
  }

  const updates = [];
  const imageItems = []; // { slug, url }

  for (const item of results) {
    const match = findBestMatch(item, KNOWN_PLACES);
    if (!match) continue;

    const { slug, score } = match;
    const setParts = [];

    const phone   = formatPhone(item.phone);
    const website = item.website || item.web_site || null;
    const hours   = convertHours(item.open_hours || item.hours || null);
    const price   = convertPrice(item.price || item.price_range || null);
    const rating  = asNumber(item.review_rating ?? item.rating);
    const reviewCount = asInt(item.review_count ?? item.reviews_count);
    const latitude = asNumber(item.latitude);
    const longitude = asNumber(item.longitude);
    const address = item.address || item.complete_address || null;
    const description = pickDescription(item);
    const googlePlaceId = pickGooglePlaceId(item);
    const googleMapsUrl = pickGoogleMapsUrl(item);

    if (phone)   setParts.push(`phone = ${escapeSql(phone)}`);
    if (website) setParts.push(`website = ${escapeSql(website)}`);
    if (hours)   setParts.push(`opening_hours = ${escapeSql(JSON.stringify(hours))}`);
    if (price)   setParts.push(`price_range = ${escapeSql(price)}`);
    if (rating !== null) setParts.push(`rating = ${rating}`);
    if (reviewCount !== null) setParts.push(`review_count = ${reviewCount}`);
    if (latitude !== null) setParts.push(`latitude = ${latitude}`);
    if (longitude !== null) setParts.push(`longitude = ${longitude}`);
    if (address) setParts.push(`address = COALESCE(NULLIF(address, ''), ${escapeSql(address)})`);
    if (googlePlaceId) setParts.push(`google_place_id = COALESCE(NULLIF(google_place_id, ''), ${escapeSql(googlePlaceId)})`);
    if (googleMapsUrl) setParts.push(`google_maps_url = COALESCE(NULLIF(google_maps_url, ''), ${escapeSql(googleMapsUrl)})`);
    setParts.push(`data_source = 'google-maps-scraper'`);
    setParts.push(`last_verified_at = NOW()`);
    setParts.push(`verified_by = 'google-maps-scraper'`);
    if (description) {
      setParts.push(`short_description = COALESCE(NULLIF(short_description, ''), ${escapeSql(description.slice(0, 240))})`);
      setParts.push(`description = COALESCE(NULLIF(description, ''), ${escapeSql(description.slice(0, 1200))})`);
    }
    if (DO_IMAGES) {
      const imgUrls = pickImageUrls(item);
      if (imgUrls.length > 0) {
        imageItems.push({ slug, urls: imgUrls, name: KNOWN_PLACES[slug] });
        const localPaths = imgUrls.map((_, index) => `/uploads/places/${slug}${index === 0 ? '' : `-${index + 1}`}.jpg`);
        setParts.push(`thumbnail_url = COALESCE(NULLIF(thumbnail_url, ''), ${escapeSql(localPaths[0])})`);
        setParts.push(`images = COALESCE(images, ARRAY[${localPaths.map(escapeSql).join(', ')}]::text[])`);
      }
    }

    if (setParts.length > 0) {
      updates.push({ slug, score: score.toFixed(2), setParts, name: KNOWN_PLACES[slug] });
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
      for (const im of imageItems) console.log(`  ${im.slug}: ${im.urls.join(', ')}`);
    }
    return;
  }

  // ─── DB güncelle ───────────────────────────────────────────────────────────
  if (updates.length > 0) {
    if (!DB_URL) {
      console.error('\nDB_URL bulunamadı (.env.scripts içinde DATABASE_URL veya PROD_DATABASE_URL gerekli)');
      console.log('\nSQL\'i elle uygulamak için:\n' + sql);
    } else {
      console.log('\nDB güncellemesi uygulanıyor...');
      const dbResult = await runSql(sql);
      if (!dbResult.ok) {
        console.error(`DB güncellemesi başarısız (${dbResult.mode}): ${dbResult.output}`);
        console.log('\nSQL\'i elle uygulamak için:\n' + sql);
      } else {
        console.log(`DB (${dbResult.mode}): ${dbResult.output}`);
        console.log(`✓ ${updates.length} mekan güncellendi.`);
      }
    }
  }

  // ─── Görselleri indir ve yükle ─────────────────────────────────────────────
  if (DO_IMAGES && imageItems.length > 0) {
    const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
    const remotePub  = `${REMOTE_DIR}/public/uploads/places`;
    const remoteDist = `${REMOTE_DIR}/dist/client/uploads/places`;
    const localPub = resolve(scriptDir, '..', 'public', 'uploads', 'places');
    mkdirSync(localPub, { recursive: true });

    console.log(`\nGörsel SFTP yükleme: ${imageItems.length} mekan...`);
    const canRemoteUpload = SSH_HOST && SSH_USER && SSH_PASS;
    const sftp = canRemoteUpload ? new SftpClient() : null;
    if (sftp) {
      await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
      try { await sftp.mkdir(remotePub, true); } catch {}
      try { await sftp.mkdir(remoteDist, true); } catch {}
    }

    let imgOk = 0, imgFail = 0;
    for (const { slug, urls, name } of imageItems) {
      for (let index = 0; index < urls.length; index++) {
        const filename = `${slug}${index === 0 ? '' : `-${index + 1}`}.jpg`;
        process.stdout.write(`  [görsel] ${name} #${index + 1}... `);
        try {
          const buf = await downloadBuffer(urls[index]);
          writeFileSync(resolve(localPub, filename), buf);
          if (sftp) {
            await sftp.put(buf, `${remotePub}/${filename}`);
            await sftp.put(buf, `${remoteDist}/${filename}`);
          }
          console.log(`✓ (${(buf.length / 1024).toFixed(0)} KB)`);
          imgOk++;
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.log(`✗ ${e.message}`);
          imgFail++;
        }
      }
    }
    if (sftp) await sftp.end();
    console.log(`\n✓ Görsel: ${imgOk} yüklendi, ${imgFail} başarısız.`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
