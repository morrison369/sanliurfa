#!/usr/bin/env node
/**
 * Google Indexing API: yeni veya kaldırılmış URL'i Google'a bildir.
 *
 * Google'ın resmi politikası: Indexing API SADECE şu type'lar için:
 *   - JobPosting (iş ilanları)
 *   - BroadcastEvent (canlı yayınlar, live event)
 *
 * Diğer içerikler için kullanım ban riski taşır. Bu script güvenli kullanım
 * için sadece event detail pages (Event schema) URL'leri gönderir.
 *
 * Quota: 200 URL/day (default). Approval ile daha yüksek limit.
 *
 * Kullanım:
 *   node scripts/gsc-indexing-notify.mjs <url>             # URL_UPDATED
 *   node scripts/gsc-indexing-notify.mjs <url> --removed   # URL_DELETED
 *   node scripts/gsc-indexing-notify.mjs --batch=events    # tüm published events
 *
 * Requires: indexing scope + SA Owner on GSC property.
 */
import https from 'node:https';
import { getGscToken } from './lib/gsc-auth.mjs';

const ARGS = process.argv.slice(2);
const removed = ARGS.includes('--removed');
const batch = ARGS.find(a => a.startsWith('--batch='))?.split('=')[1];
const urlArg = ARGS.find(a => a.startsWith('http')) || null;

async function notifyUrl(token, url, type = 'URL_UPDATED') {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ url, type });
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    req.write(payload);
    req.end();
  });
}

async function fetchEventUrls() {
  // Sitemap-events.xml'den URL listesi
  return new Promise((resolve) => {
    https.get('https://sanliurfa.com/sitemap-events.xml', (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        const urls = [...data.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        resolve(urls);
      });
    }).on('error', () => resolve([]));
  });
}

(async () => {
  if (!urlArg && !batch) {
    console.error('Kullanım: node scripts/gsc-indexing-notify.mjs <url> [--removed]');
    console.error('         node scripts/gsc-indexing-notify.mjs --batch=events');
    process.exit(1);
  }

  console.log('\n📤 Google Indexing API\n');
  const auth = await getGscToken(['https://www.googleapis.com/auth/indexing']);
  console.log(`🔑 Auth: ${auth.source}${auth.email ? ' (' + auth.email + ')' : ''}\n`);

  const type = removed ? 'URL_DELETED' : 'URL_UPDATED';
  const urls = urlArg ? [urlArg] : (batch === 'events' ? await fetchEventUrls() : []);

  console.log(`  ${urls.length} URL bildirilecek (type=${type})\n`);

  let ok = 0, fail = 0;
  for (const u of urls) {
    const res = await notifyUrl(auth.token, u, type);
    const success = res.status >= 200 && res.status < 300;
    console.log(`  ${success ? '✓' : '✗'} ${u}  HTTP ${res.status}`);
    if (!success && res.body?.error) {
      console.log(`     ${res.body.error.message?.slice(0, 120)}`);
    }
    if (success) ok++; else fail++;
  }

  console.log(`\n${ok}/${urls.length} başarılı`);
  if (fail === urls.length) process.exit(1);
})();
