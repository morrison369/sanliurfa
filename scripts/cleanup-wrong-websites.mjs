#!/usr/bin/env node
/**
 * Scraping sonrası yanlış/şüpheli website URL'lerini temizler.
 *
 * Kaldırılacaklar:
 * - Sanal tur platformları (keypano.com, matterport.com, google.com/maps gibi)
 * - Yabancı ülke domainleri (.mk, .hr, .bg, .rs, .gr vs.) — yerel işletme değil
 * - Açıkça yanlış eşleşmeler (duplicate URL birden fazla mekana atanmış)
 *
 * Korunacaklar:
 * - .com.tr, .tr domain'leri
 * - Sosyal medya (instagram.com, facebook.com, twitter.com)
 * - Tanınmış Türk zincir markaları
 * - Devlet kurumları (.gov.tr, .edu.tr, .org.tr)
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

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LOCAL_TUNNEL_PORT = 15570;

// Sanal tur / yanlış platformlar
const VIRTUAL_TOUR_DOMAINS = ['keypano.com', 'matterport.com'];

// Yabancı ülke TLD'leri (Türkiye dışı) — bu domainlerdeki işletme web siteleri yanlış eşleşme
const FOREIGN_TLDS = [
  '.mk', '.hr', '.bg', '.rs', '.gr', '.al', '.ba', '.me', '.ro', '.ua',
  '.ru', '.am', '.az', '.ge', '.ir', '.iq', '.sy', '.lb', '.eg', '.sa',
  '.ae', '.kw', '.qa', '.de', '.fr', '.it', '.es', '.pl', '.nl', '.be',
  '.at', '.ch', '.se', '.no', '.dk', '.fi', '.sk', '.hu', '.cz',
];

// İzin verilen yabancı domainler (global markalar, ülke bağımsız)
const ALLOWED_GLOBAL_DOMAINS = [
  'instagram.com', 'facebook.com', 'twitter.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'google.com',
  'booking.com', 'tripadvisor.com', 'foursquare.com',
  'maps.app.goo.gl', 'goo.gl',
];

function isDomainAllowed(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Virtual tour platformları — kesinlikle hayır
    if (VIRTUAL_TOUR_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return false;

    // İzin verilen global domainler
    if (ALLOWED_GLOBAL_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return true;

    // Türkiye domainleri — her zaman izin ver
    if (hostname.endsWith('.tr') || hostname.endsWith('.com.tr') ||
        hostname.endsWith('.gov.tr') || hostname.endsWith('.edu.tr') ||
        hostname.endsWith('.org.tr') || hostname.endsWith('.net.tr')) return true;

    // Yabancı ülke TLD kontrolü
    for (const tld of FOREIGN_TLDS) {
      if (hostname.endsWith(tld)) return false;
    }

    return true; // Şüpheli ama genel .com/.net/.org — koru
  } catch {
    return false;
  }
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

async function main() {
  console.log(`\n🧹 Website URL temizleme${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: all } = await client.query(
    `SELECT slug, name, website FROM app.places WHERE status='active' AND website IS NOT NULL AND website != '' ORDER BY name`
  );

  console.log(`📋 Website bulunan mekan sayısı: ${all.length}\n`);

  // 1) Domain kontrolü
  const domainBad = all.filter(r => !isDomainAllowed(r.website));

  // 2) Duplicate URL — aynı URL birden fazla mekana yazılmış (virtual tour gibi)
  // İstisna: resmi kurumlar (.gov.tr, .bel.tr, .edu.tr, .org.tr) aynı URL'i paylaşabilir.
  function isOfficialSharedDomain(url) {
    try {
      const h = new URL(url).hostname.toLowerCase();
      return h.endsWith('.gov.tr') || h.endsWith('.bel.tr') || h.endsWith('.edu.tr') || h.endsWith('.org.tr');
    } catch { return false; }
  }
  const urlCount = {};
  for (const r of all) urlCount[r.website] = (urlCount[r.website] || 0) + 1;
  const duplicates = all.filter(r => urlCount[r.website] > 1 && !isOfficialSharedDomain(r.website));

  // Birleşik kötü liste (domain bad OR duplicate)
  const badSlugs = new Set([...domainBad, ...duplicates].map(r => r.slug));
  const badAll = all.filter(r => badSlugs.has(r.slug));

  console.log('=== Kaldırılacak URLler ===');
  for (const r of badAll) {
    const reason = domainBad.find(x => x.slug === r.slug) ? 'DOMAIN' : 'DUPLIKAT';
    console.log(`  [${reason}] ${r.name.substring(0, 35).padEnd(35)} → ${r.website.substring(0, 55)}`);
  }

  console.log(`\nToplam kaldırılacak: ${badAll.length}`);

  if (!DRY_RUN && badAll.length > 0) {
    for (const r of badAll) {
      await client.query(
        `UPDATE app.places SET website = NULL, updated_at = NOW() WHERE slug = $1`,
        [r.slug]
      );
    }
  }

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active' AND website IS NOT NULL AND website != '') AS has_website,
      COUNT(*) FILTER (WHERE status='active' AND (website IS NULL OR website = '')) AS no_website
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n${DRY_RUN ? '(dry-run) ' : '✅'} ${badAll.length} yanlış URL ${DRY_RUN ? 'tespit edildi' : 'silindi'}`);
  console.log(`📊 Websiteli: ${stats.has_website} | Websitesiz: ${stats.no_website}`);
}

main().catch(e => { console.error(e); process.exit(1); });
