#!/usr/bin/env node
/**
 * Sitemap auto-notify: IndexNow protokolü (Bing + Yandex + Seznam + Naver).
 *
 * Google ve Bing'in eski "?sitemap=" GET ping endpoint'leri 2023'te kapatıldı.
 * Yenisi: IndexNow — Bing tarafından geliştirildi, Yandex + Seznam + Naver kabul ediyor.
 * Google için ayrı: Search Console API (service account auth gerekli).
 *
 * Cron: günde 1 kez. Yeni içerik 24h içinde discovery.
 *
 * Setup (tek seferlik):
 *   1. Random 32 char key üret (script otomatik yapar)
 *   2. public/<key>.txt verification dosyası (script otomatik yarar)
 *   3. Bu dosyayı deploy et
 *   4. .indexnow-key dosyasını gitignore'a ekle
 *
 * Kullanım:
 *   node scripts/sitemap-ping-search-engines.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

const HOST = process.env.SITE_HOST || 'sanliurfa.com';
const SITE_URL = `https://${HOST}`;
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

// IndexNow key — env'den oku veya yeniden yarat
let INDEXNOW_KEY = process.env.SF_INDEXNOW_KEY || '';
const keyFile = path.join(projectRoot, '.indexnow-key');
if (!INDEXNOW_KEY && fs.existsSync(keyFile)) {
  INDEXNOW_KEY = fs.readFileSync(keyFile, 'utf8').trim();
}
if (!INDEXNOW_KEY) {
  INDEXNOW_KEY = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(keyFile, INDEXNOW_KEY);
  console.log(`📝 Yeni IndexNow key oluşturuldu: ${INDEXNOW_KEY}`);
  console.log(`   .indexnow-key dosyasına kaydedildi (gitignore!).`);
  // Auto-create verification file in public/
  const publicKeyFile = path.join(projectRoot, 'public', `${INDEXNOW_KEY}.txt`);
  fs.writeFileSync(publicKeyFile, INDEXNOW_KEY);
  console.log(`   ✓ public/${INDEXNOW_KEY}.txt oluşturuldu (deploy edilmeli).`);
}

const TARGETS = [
  { name: 'IndexNow Hub',  host: 'api.indexnow.org' },
  { name: 'Bing',          host: 'www.bing.com' },
  { name: 'Yandex',        host: 'yandex.com' },
];

async function fetchUrlsFromSitemap() {
  return new Promise((resolve) => {
    https.get(SITEMAP_URL, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const subSitemaps = [...data.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        resolve(subSitemaps);
      });
    }).on('error', () => resolve([]));
  });
}

async function fetchSubSitemapUrls(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const urls = [...data.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        resolve(urls);
      });
    }).on('error', () => resolve([]));
  });
}

function submitToIndexNow(target, urls) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000),
    });

    const req = https.request({
      hostname: target.host,
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Host': target.host,
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ name: target.name, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }));
    });
    req.on('error', (e) => resolve({ name: target.name, status: 0, ok: false, error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ name: target.name, status: 0, ok: false, error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log(`\n📡 IndexNow ping — ${SITEMAP_URL}\n`);

  const subSitemaps = await fetchUrlsFromSitemap();
  console.log(`  ${subSitemaps.length} sub-sitemap bulundu`);

  const allUrls = new Set();
  for (const sm of subSitemaps.slice(0, 9)) {
    const urls = await fetchSubSitemapUrls(sm);
    urls.forEach(u => allUrls.add(u));
  }
  const urlList = [...allUrls];
  console.log(`  ${urlList.length} URL toplandı\n`);

  if (urlList.length === 0) {
    console.error('  ⊘ URL bulunamadı, ping iptal.');
    process.exit(1);
  }

  const results = await Promise.all(TARGETS.map(t => submitToIndexNow(t, urlList)));
  for (const r of results) {
    const status = r.ok ? '✓' : '✗';
    console.log(`  ${status} ${r.name.padEnd(20)} HTTP ${r.status}${r.error ? ' — ' + r.error : ''}`);
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} endpoint başarılı`);
  console.log(`Indexed: ${urlList.length} URL\n`);
  process.exit(failed.length === results.length ? 1 : 0);
})();
