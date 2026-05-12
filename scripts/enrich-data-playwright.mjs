#!/usr/bin/env node
/**
 * Tek Google Maps scraping turunda hem website URL hem de telefon zenginleştirme.
 *
 * - Website: tüm 533 mekan için (sıfırdan)
 * - Telefon: sadece phone IS NULL olan mekanlar için (231 adet)
 *
 * KULLANIM:
 *   node scripts/enrich-data-playwright.mjs              # tam çalıştırma
 *   node scripts/enrich-data-playwright.mjs --dry-run    # DB'ye yazma
 *   node scripts/enrich-data-playwright.mjs --limit 20  # ilk N mekan
 *   node scripts/enrich-data-playwright.mjs --phone-only # sadece telefon
 *   node scripts/enrich-data-playwright.mjs --web-only   # sadece website
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

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
const DRY_RUN = args.includes('--dry-run');
const PHONE_ONLY = args.includes('--phone-only');
const WEB_ONLY = args.includes('--web-only');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 0;
const offsetIdx = args.indexOf('--offset');
const OFFSET = offsetIdx >= 0 ? parseInt(args[offsetIdx + 1]) : 0;
const LOCAL_TUNNEL_PORT = 15565;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Phone helpers ────────────────────────────────────────────────────────────

function formatPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('90')) return `+${digits}`;
  if (digits.length > 7) return raw.trim();
  return null;
}

// Yanlış şehir telefon kontrolü — yanlış şehir scrape'lenmesin
const WRONG_CITY_RE = [
  /^\+90212/, /^\+90216/, /^\+90217/, /^\+90218/, /^\+90219/,
  /^\+90312/, /^\+90313/, /^\+90232/, /^\+90242/, /^\+90322/,
  /^\+90324/, /^\+90282/, /^\+90284/, /^\+90352/, /^\+90384/,
  /^\+90388/, /^\+90224/, /^\+90332/, /^\+90342/, /^\+90412/,
  /^\+90326/, /^\+90422/, /^\+90424/, /^\+90462/, /^\+90362/,
  /^\+90442/, /^\+90432/, /^\+90482/, /^\+90484/, /^\+9048/,
  /^\+90256/, /^\+90286/, /^\+385/, // Aydın, Çanakkale, Hırvatistan
  /^0232/, /^0212/, /^0242/, /^0312/, /^0322/, /^0332/, /^0342/, /^0412/,
];
function isWrongCity(phone) {
  return phone ? WRONG_CITY_RE.some(re => re.test(phone)) : false;
}

// ─── Website helpers ──────────────────────────────────────────────────────────

function cleanWebsiteUrl(raw) {
  if (!raw) return null;
  const url = raw.trim();
  // Sadece http/https kabul et
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
  // Google Maps redirect URL'lerini temizle
  if (url.includes('google.com/url?')) {
    try {
      const u = new URL(url);
      const q = u.searchParams.get('q') || u.searchParams.get('url');
      if (q && (q.startsWith('http://') || q.startsWith('https://'))) return q;
    } catch {}
  }
  // 255 karakter sınırı (DB varchar)
  return url.length > 255 ? null : url;
}

// ─── Similarity ───────────────────────────────────────────────────────────────

function normalize(str) {
  return (str || '').toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
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

// ─── SSH Tunnel ───────────────────────────────────────────────────────────────

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
          keepaliveInterval: 10000, keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

// ─── Page extraction ──────────────────────────────────────────────────────────

async function extractFromDetailPage(page) {
  const result = { phone: null, website: null };

  // Phone: tel: linki
  try {
    const telLink = page.locator('a[href^="tel:"]').first();
    if (await telLink.isVisible({ timeout: 3000 })) {
      const href = await telLink.getAttribute('href');
      result.phone = formatPhone(href.replace('tel:', ''));
    }
  } catch {}

  // Phone: fallback button aria-label
  if (!result.phone) {
    try {
      const buttons = page.locator('button');
      const count = await buttons.count();
      for (let i = 0; i < Math.min(count, 40); i++) {
        const label = await buttons.nth(i).getAttribute('aria-label').catch(() => '');
        if (label && label.startsWith('Telefon:')) {
          result.phone = formatPhone(label.replace('Telefon:', '').trim());
          break;
        }
      }
    } catch {}
  }

  // Website: data-item-id="authority" — dil bağımsız, en kararlı selector
  try {
    const webLink = page.locator('a[data-item-id="authority"]').first();
    if (await webLink.isVisible({ timeout: 3000 })) {
      const href = await webLink.getAttribute('href');
      result.website = cleanWebsiteUrl(href);
    }
  } catch {}

  // Website: fallback — aria-label "Web sitesi:" veya "Website:"
  if (!result.website) {
    try {
      const links = page.locator('a[href^="http"]');
      const count = await links.count();
      for (let i = 0; i < Math.min(count, 30); i++) {
        const label = await links.nth(i).getAttribute('aria-label').catch(() => '');
        if (label && (label.includes('Web sitesi') || label.toLowerCase().includes('website'))) {
          const href = await links.nth(i).getAttribute('href');
          result.website = cleanWebsiteUrl(href);
          if (result.website) break;
        }
      }
    } catch {}
  }

  return result;
}

async function scrapePlace(page, placeName, address) {
  const loc = (address || '').toLowerCase().includes('şanlıurfa') ? '' : ' Şanlıurfa';
  const query = encodeURIComponent(`${placeName}${loc}`);
  const searchUrl = `https://www.google.com/maps/search/${query}?hl=tr`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    try {
      await page.waitForSelector('[role="article"], a[href^="tel:"], a[data-item-id="authority"]', { timeout: 6000 });
    } catch {}
    await sleep(800);

    const currentUrl = page.url();

    // Google doğrudan detay sayfasına yönlendirdiyse
    if (!currentUrl.includes('/maps/search/')) {
      return await extractFromDetailPage(page);
    }

    // Arama sonuçları — en iyi eşleşeni bul ve detaya git
    const articles = page.locator('[role="article"]');
    const count = await articles.count().catch(() => 0);
    if (count === 0) return { phone: null, website: null };

    let bestLink = null, bestScore = 0;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = articles.nth(i).locator('a[href]').first();
      const text = await link.textContent().catch(() => '');
      const score = similarity(placeName, text);
      if (score > bestScore) { bestScore = score; bestLink = link; }
    }
    if (!bestLink) bestLink = articles.nth(0).locator('a[href]').first();

    const href = await bestLink.getAttribute('href').catch(() => null);
    if (!href) return { phone: null, website: null };

    const detailUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    try {
      await page.waitForSelector('a[href^="tel:"], a[data-item-id="authority"]', { timeout: 6000 });
    } catch {}
    await sleep(800);

    return await extractFromDetailPage(page);
  } catch {
    return { phone: null, website: null };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mode = PHONE_ONLY ? 'SADECE TELEFON' : WEB_ONLY ? 'SADECE WEBSİTE' : 'TELEFON + WEBSİTE';
  console.log(`\n🔍 Google Maps Zenginleştirme — ${mode}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  // Hedef mekanları belirle:
  // - phone-only: telefonsuz olanlar
  // - web-only: websitesiz olanlar
  // - default: herhangi biri eksik olan (union)
  let whereClause;
  if (PHONE_ONLY) {
    whereClause = `(p.phone IS NULL OR p.phone = '')`;
  } else if (WEB_ONLY) {
    whereClause = `(p.website IS NULL OR p.website = '')`;
  } else {
    whereClause = `((p.phone IS NULL OR p.phone = '') OR (p.website IS NULL OR p.website = ''))`;
  }

  const { rows: places } = await client.query(`
    SELECT p.id, p.name, p.slug, p.address,
           (p.phone IS NULL OR p.phone = '') AS needs_phone,
           (p.website IS NULL OR p.website = '') AS needs_website
    FROM app.places p
    WHERE p.status = 'active' AND ${whereClause}
    ORDER BY p.name ASC
    ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ''}
    ${OFFSET > 0 ? `OFFSET ${OFFSET}` : ''}
  `);

  const needPhone = places.filter(p => p.needs_phone).length;
  const needWeb = places.filter(p => p.needs_website).length;
  console.log(`📋 ${places.length} mekan hedeflendi (${needPhone} telefonsuz, ${needWeb} websitesiz)\n`);

  if (places.length === 0) {
    console.log('✅ Tüm mekanlar güncel!');
    await client.end(); server.close(); ssh.end();
    return;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=tr'],
  });
  const context = await browser.newContext({
    locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  console.log('🌐 Browser başlatıldı\n');

  let phoneOk = 0, phoneNo = 0, webOk = 0, webNo = 0, errors = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const idx = `[${i + 1}/${places.length}]`;
    process.stdout.write(`${idx} ${p.name.substring(0, 35).padEnd(35)} `);

    try {
      const scraped = await scrapePlace(page, p.name, p.address);

      const phoneRaw = scraped.phone;
      const phone = phoneRaw && !isWrongCity(phoneRaw) ? phoneRaw : null;
      const website = scraped.website;

      const updatePhone = p.needs_phone && phone && !WEB_ONLY;
      const updateWebsite = p.needs_website && website && !PHONE_ONLY;

      let parts = [];
      if (updatePhone) { parts.push(`☎ ${phone}`); phoneOk++; }
      else if (p.needs_phone && !WEB_ONLY) { phoneNo++; }

      if (updateWebsite) { parts.push(`🌐 ${website.substring(0, 35)}`); webOk++; }
      else if (p.needs_website && !PHONE_ONLY) { webNo++; }

      if (parts.length > 0) {
        console.log(parts.join(' | '));
        if (!DRY_RUN) {
          const sets = [];
          const vals = [];
          if (updatePhone) { vals.push(phone); sets.push(`phone = $${vals.length}`); }
          if (updateWebsite) { vals.push(website); sets.push(`website = $${vals.length}`); }
          if (sets.length > 0) {
            vals.push(p.slug);
            await client.query(
              `UPDATE app.places SET ${sets.join(', ')}, updated_at = NOW() WHERE slug = $${vals.length}`,
              vals
            );
          }
        }
      } else {
        console.log('─ veri yok');
      }
    } catch (e) {
      console.log(`✗ hata: ${e.message.slice(0, 50)}`);
      errors++;
    }

    await sleep(1500 + Math.random() * 1000);

    if ((i + 1) % 20 === 0) {
      await page.goto('about:blank').catch(() => {});
      await sleep(3000);
      console.log(`  ── ${i + 1}/${places.length} tamamlandı, devam ediyor...\n`);
    }
  }

  await browser.close();

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND (phone IS NULL OR phone='')) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NOT NULL AND phone!='') AS has_phone,
      COUNT(*) FILTER (WHERE status='active' AND (website IS NULL OR website='')) AS no_website,
      COUNT(*) FILTER (WHERE status='active' AND website IS NOT NULL AND website!='') AS has_website
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n${DRY_RUN ? '(dry-run) ' : ''}Sonuçlar:`);
  console.log(`  ☎  Telefon: ${phoneOk} eklendi | ${phoneNo} bulunamadı`);
  console.log(`  🌐 Website: ${webOk} eklendi | ${webNo} bulunamadı | ${errors} hata`);
  console.log(`\n📊 DB Durumu:`);
  console.log(`  Toplam: ${stats.total} | Telefonlu: ${stats.has_phone} | Telefonsuz: ${stats.no_phone}`);
  console.log(`  Websiteli: ${stats.has_website} | Websitesiz: ${stats.no_website}`);
}

main().catch(e => { console.error(e); process.exit(1); });
