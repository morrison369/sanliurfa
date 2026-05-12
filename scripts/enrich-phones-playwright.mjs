#!/usr/bin/env node
/**
 * Telefonsuz mekanlar için Node.js Playwright ile Google Maps telefon zenginleştirme.
 *
 * KULLANIM:
 *   node scripts/enrich-phones-playwright.mjs           # tam çalıştırma
 *   node scripts/enrich-phones-playwright.mjs --dry-run  # güncelleme yapma
 *   node scripts/enrich-phones-playwright.mjs --limit 10 # ilk N mekan
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
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 0;
const offsetIdx = args.indexOf('--offset');
const OFFSET = offsetIdx >= 0 ? parseInt(args[offsetIdx + 1]) : 0;
const LOCAL_TUNNEL_PORT = 15552;

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function extractPhoneFromDetailPage(page) {
  // tel: linki en güvenilir kaynak
  try {
    const telLink = page.locator('a[href^="tel:"]').first();
    if (await telLink.isVisible({ timeout: 5000 })) {
      const href = await telLink.getAttribute('href');
      return formatPhone(href.replace('tel:', ''));
    }
  } catch {}

  // Fallback: "Telefon: +90..." etiketli button
  try {
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 50); i++) {
      const label = await buttons.nth(i).getAttribute('aria-label').catch(() => '');
      if (label && label.startsWith('Telefon:')) {
        return formatPhone(label.replace('Telefon:', '').trim());
      }
    }
  } catch {}

  return null;
}

async function scrapePhone(page, placeName, address) {
  const loc = (address || '').toLowerCase().includes('şanlıurfa') ? '' : ' Şanlıurfa';
  const query = encodeURIComponent(`${placeName}${loc}`);
  const searchUrl = `https://www.google.com/maps/search/${query}?hl=tr`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    try { await page.waitForSelector('[role="article"], a[href^="tel:"]', { timeout: 6000 }); } catch {}
    await sleep(1000);

    const currentUrl = page.url();

    // Google doğrudan detay sayfasına yönlendirdiyse
    if (!currentUrl.includes('/maps/search/')) {
      return await extractPhoneFromDetailPage(page);
    }

    // Arama sonuçları sayfası — [role="article"] ile en iyi eşleşeni bul
    const articles = page.locator('[role="article"]');
    const count = await articles.count().catch(() => 0);
    if (count === 0) return null;

    let bestLink = null, bestScore = 0;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const article = articles.nth(i);
      const link = article.locator('a[href]').first();
      const linkText = await link.textContent().catch(() => '');
      const score = similarity(placeName, linkText);
      if (score > bestScore) {
        bestScore = score;
        bestLink = link;
      }
    }

    // Eşleşme çok düşükse ilk sonucu dene
    if (!bestLink) bestLink = articles.nth(0).locator('a[href]').first();

    const href = await bestLink.getAttribute('href').catch(() => null);
    if (!href) return null;

    const detailUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    try { await page.waitForSelector('a[href^="tel:"], button[aria-label^="Telefon:"]', { timeout: 6000 }); } catch {}
    await sleep(1000);

    return await extractPhoneFromDetailPage(page);
  } catch {
    return null;
  }
}

async function main() {
  console.log('\n📞 Node.js Playwright ile Google Maps telefon zenginleştirme\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: phoneless } = await client.query(`
    SELECT p.id, p.name, p.slug, p.address
    FROM app.places p
    WHERE p.status = 'active'
      AND (p.phone IS NULL OR p.phone = '')
    ORDER BY p.name ASC
    ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ''}
    ${OFFSET > 0 ? `OFFSET ${OFFSET}` : ''}
  `);

  console.log(`📋 ${phoneless.length} telefonsuz mekan\n`);

  if (phoneless.length === 0) {
    console.log('✅ Tüm mekanların telefonu mevcut!');
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

  let ok = 0, noPhone = 0, errors = 0;

  for (let i = 0; i < phoneless.length; i++) {
    const p = phoneless[i];
    const idx = `[${i + 1}/${phoneless.length}]`;
    process.stdout.write(`${idx} ${p.name}... `);

    try {
      const phone = await scrapePhone(page, p.name, p.address);

      if (!phone) {
        console.log('❌ telefon yok');
        noPhone++;
      } else if (DRY_RUN) {
        console.log(`✓ ${phone} (dry-run)`);
        ok++;
      } else {
        await client.query(
          `UPDATE app.places SET phone = $1, updated_at = NOW() WHERE slug = $2`,
          [phone, p.slug]
        );
        console.log(`✓ ${phone}`);
        ok++;
      }
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 60)}`);
      errors++;
    }

    // Rate limit önlemi: 1.5-2.5s arası bekleme
    await sleep(1500 + Math.random() * 1000);

    // Her 20 mekanda sayfayı sıfırla
    if ((i + 1) % 20 === 0) {
      await page.goto('about:blank').catch(() => {});
      await sleep(3000);
    }
  }

  await browser.close();

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND (phone IS NULL OR phone = '')) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NOT NULL AND phone != '') AS has_phone
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n✅ ${ok} telefon güncellendi`);
  console.log(`📭 ${noPhone} telefon bulunamadı | ${errors} hata`);
  console.log(`📊 Toplam: ${stats.total} | Telefonsuz: ${stats.no_phone} | Telefonlu: ${stats.has_phone}`);
}

main().catch(e => { console.error(e); process.exit(1); });
