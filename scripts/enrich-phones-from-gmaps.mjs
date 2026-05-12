#!/usr/bin/env node
/**
 * Telefonsuz mekanlar için Google Maps Scraper ile telefon numarası çeker.
 *
 * KULLANIM:
 *   node scripts/enrich-phones-from-gmaps.mjs           # tam çalıştırma
 *   node scripts/enrich-phones-from-gmaps.mjs --dry-run  # SQL'i göster, uygulama
 *   node scripts/enrich-phones-from-gmaps.mjs --skip-scrape --input scripts/gmaps-phones.json
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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

const args = process.argv.slice(2);
const DRY_RUN     = args.includes('--dry-run');
const SKIP_SCRAPE = args.includes('--skip-scrape');
const inputIdx    = args.indexOf('--input');
const INPUT_FILE  = inputIdx >= 0 ? args[inputIdx + 1] : path.join(scriptDir, 'gmaps-phones.json');
const QUERIES_FILE = path.join(scriptDir, 'gmaps-phones-queries.txt');
const LOCAL_TUNNEL_PORT = 15549;

// Binary arama: önce tools/, sonra scripts/
const BINARY_PATHS = [
  path.join(projectRoot, '..', 'tools', 'google-maps-scraper.exe'),
  path.join(projectRoot, '..', 'tools', 'google-maps-scraper'),
  path.join(scriptDir, 'google-maps-scraper.exe'),
  path.join(scriptDir, 'google-maps-scraper'),
];

function findBinary() {
  for (const p of BINARY_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('90')) return `+${digits}`;
  if (digits.length > 7) return phone; // yabancı veya bilinmeyen format — olduğu gibi bırak
  return null;
}

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
          keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n📞 Telefonsuz mekanlar için Google Maps telefon zenginleştirme\n');

  // 1. SSH tünel aç ve telefonsuz mekanları çek
  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1',
    port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: phoneless } = await client.query(`
    SELECT p.id, p.name, p.slug, p.address, c.name AS category_name
    FROM app.places p
    LEFT JOIN app.categories c ON c.id = p.category_id
    WHERE p.status = 'active'
      AND (p.phone IS NULL OR p.phone = '')
    ORDER BY p.name ASC
  `);

  console.log(`📋 ${phoneless.length} telefonsuz mekan bulundu\n`);

  if (phoneless.length === 0) {
    console.log('✅ Tüm mekanların telefonu mevcut!');
    await client.end(); server.close(); ssh.end();
    return;
  }

  // 2. Sorgu dosyası oluştur
  const queries = phoneless.map(p => {
    const loc = (p.address || '').includes('Şanlıurfa') ? '' : ' Şanlıurfa';
    return `${p.name}${loc}`;
  });
  fs.writeFileSync(QUERIES_FILE, queries.join('\n'), 'utf8');
  console.log(`✓ Sorgu dosyası oluşturuldu: ${QUERIES_FILE} (${queries.length} sorgu)`);

  // 3. Scraper çalıştır
  if (!SKIP_SCRAPE) {
    const binary = findBinary();
    if (!binary) {
      console.error('\n❌ google-maps-scraper.exe bulunamadı!');
      console.error('   Beklenen konum: D:\\sanliurfa.com\\tools\\google-maps-scraper.exe');
      console.error('   İndir: https://github.com/gosom/google-maps-scraper/releases\n');
      await client.end(); server.close(); ssh.end();
      process.exit(1);
    }

    console.log(`\n🔍 Scraper çalışıyor: ${binary}`);
    console.log('   Bu işlem birkaç dakika sürebilir...\n');

    const result = spawnSync(binary, [
      '-input', QUERIES_FILE,
      '-results', INPUT_FILE,
      '-json',
      '-lang', 'tr',
      '-depth', '1',
      '-exit-on-inactivity', '5m',
      '-c', '1',
    ], { stdio: 'inherit', windowsHide: false });

    if (result.status !== 0) {
      console.error(`Scraper hatası (exit ${result.status})`);
      await client.end(); server.close(); ssh.end();
      process.exit(1);
    }
    console.log('\n✓ Scraper tamamlandı');
  }

  // 4. Sonuçları oku
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Sonuç dosyası bulunamadı: ${INPUT_FILE}`);
    await client.end(); server.close(); ssh.end();
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf8').trim();
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

  console.log(`\n📊 ${results.length} scraper sonucu yüklendi`);

  // 5. Eşleştir ve güncelle
  const placeMap = {};
  for (const p of phoneless) placeMap[p.slug] = p;

  let ok = 0, noMatch = 0, noPhone = 0, alreadyHas = 0;

  for (const item of results) {
    const scraped = item.title || item.name || '';
    if (!scraped) continue;

    // En iyi eşleşen mekanı bul
    let bestSlug = null, bestScore = 0;
    for (const p of phoneless) {
      const score = similarity(scraped, p.name);
      if (score > bestScore) { bestScore = score; bestSlug = p.slug; }
    }

    if (!bestSlug || bestScore < 0.5) { noMatch++; continue; }

    const phone = formatPhone(item.phone);
    if (!phone) { noPhone++; continue; }

    const place = placeMap[bestSlug];
    process.stdout.write(`  [${bestScore.toFixed(2)}] ${place.name} → ${phone} `);

    if (DRY_RUN) {
      console.log('(dry-run)');
      ok++;
      continue;
    }

    try {
      await client.query(
        `UPDATE app.places SET phone = $1, updated_at = NOW() WHERE slug = $2`,
        [phone, bestSlug]
      );
      console.log('✓');
      ok++;
      // Bu mekanı listeden çıkar (çifte update önle)
      const idx = phoneless.findIndex(p => p.slug === bestSlug);
      if (idx >= 0) phoneless.splice(idx, 1);
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 60)}`);
    }
  }

  // 6. Final istatistik
  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND (phone IS NULL OR phone = '')) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NOT NULL AND phone != '') AS has_phone
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n✅ ${ok} telefon güncellendi`);
  console.log(`📭 ${noMatch} eşleşme bulunamadı | ${noPhone} telefon verisi yok`);
  console.log(`📊 Toplam: ${stats.total} | Telefonsuz: ${stats.no_phone} | Telefonlu: ${stats.has_phone}`);
}

main().catch(e => { console.error(e); process.exit(1); });
