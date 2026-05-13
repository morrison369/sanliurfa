#!/usr/bin/env node
/**
 * Google Indexing API ile URL re-crawl talep eder.
 *
 * Auth: GSC_REFRESH_TOKEN (prod) veya ADC file (local).
 * Quota: 200 URL/day (free tier).
 *
 * Kullanım:
 *   node scripts/gsc-request-indexing.mjs                    # default key pages
 *   node scripts/gsc-request-indexing.mjs --url=URL1 --url=URL2
 *   node scripts/gsc-request-indexing.mjs --from-sitemap     # sitemap.xml'den son güncellenenler
 *
 * Not: Indexing API resmi olarak sadece JobPosting/BroadcastEvent için
 * documented; ancak general URL'ler için de çalışır (de facto SEO standardı).
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { getGscToken } from './lib/gsc-auth.mjs';

const DEFAULT_URLS = [
  'https://sanliurfa.com/',
  'https://sanliurfa.com/tarihi-yerler',
  'https://sanliurfa.com/gezilecek-yerler',
  'https://sanliurfa.com/yemek-tarifleri',
  'https://sanliurfa.com/etkinlikler',
  'https://sanliurfa.com/blog',
  'https://sanliurfa.com/mekanlar',
];

const ARGS = process.argv.slice(2);
const customUrls = ARGS.filter(a => a.startsWith('--url=')).map(a => a.slice(6));
const URLS = customUrls.length > 0 ? customUrls : DEFAULT_URLS;

function publish(token, url) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ url, type: 'URL_UPDATED' });
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-goog-user-project': process.env.GOOGLE_CLOUD_PROJECT || 'sanliurfa-com-2026',
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log(`\n📤 Indexing API — ${URLS.length} URL\n`);

  const auth = await getGscToken(['https://www.googleapis.com/auth/indexing']);
  console.log(`🔑 Auth: ${auth.source}${auth.email ? ' (' + auth.email + ')' : ''}\n`);

  let ok = 0, fail = 0;
  for (const url of URLS) {
    const r = await publish(auth.token, url);
    const indicator = r.status === 200 ? '✓' : '✗';
    const time = r.body?.urlNotificationMetadata?.latestUpdate?.notifyTime || '';
    console.log(`  ${indicator} ${r.status} ${url.padEnd(50)} ${time}`);
    if (r.status === 200) ok++;
    else {
      fail++;
      const msg = r.body?.error?.message || JSON.stringify(r.body).slice(0, 150);
      console.log(`     ${msg}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }
  console.log(`\n  ${ok}/${URLS.length} başarılı, ${fail} hata`);
  console.log(`  ℹ️  Quota: 200 URL/day free tier — bugünkü kullanım GSC Console > URL Inspection'da görünür\n`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
