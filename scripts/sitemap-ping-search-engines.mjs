#!/usr/bin/env node
/**
 * Sitemap auto-ping: Google + Bing + Yandex'e sitemap güncellenmiş notification.
 *
 * Cron: günde 1 kez (06:00 UTC) — yeni içerik 24h içinde discovery.
 * Google Indexing API gerekli authentication (service account) — bu script
 * sadece basit GET ping yapar (legacy ama hala çalışan endpoint'ler).
 *
 * Kullanım:
 *   node scripts/sitemap-ping-search-engines.mjs
 *   node scripts/sitemap-ping-search-engines.mjs --sitemap=https://sanliurfa.com/sitemap.xml
 */
import https from 'node:https';

const SITEMAP_URL = process.argv.find(a => a.startsWith('--sitemap='))?.split('=')[1] || 'https://sanliurfa.com/sitemap.xml';
const encoded = encodeURIComponent(SITEMAP_URL);

const TARGETS = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encoded}` },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encoded}` },
  { name: 'Yandex', url: `https://blogs.yandex.ru/pings/?status=success&url=${encoded}` },
];

function pingUrl(target) {
  return new Promise((resolve) => {
    const req = https.get(target.url, (res) => {
      let _data = '';
      res.on('data', (c) => (_data += c));
      res.on('end', () => resolve({ name: target.name, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }));
    });
    req.on('error', (e) => resolve({ name: target.name, status: 0, ok: false, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ name: target.name, status: 0, ok: false, error: 'timeout' }); });
  });
}

(async () => {
  console.log(`\n📡 Sitemap ping: ${SITEMAP_URL}\n`);
  const results = await Promise.all(TARGETS.map(pingUrl));
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(8)} HTTP ${r.status}${r.error ? ' — ' + r.error : ''}`);
  }
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} başarılı\n`);
  process.exit(failed.length > 0 ? 1 : 0);
})();
