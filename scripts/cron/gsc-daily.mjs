#!/usr/bin/env node
/**
 * GSC Daily Cron — günlük çalışır (önerilen: 04:00 TR).
 *
 * Görevler:
 *   1. Sitemap re-submit (Google bilinmedik içerik için tekrar crawl etsin)
 *   2. Top queries (son 7 gün) → audit log (DB'ye yazma yok, sadece log)
 *   3. URL inspection — top 5 önemli sayfa için coverage durumu
 *
 * Auth: GSC_REFRESH_TOKEN env (scripts/lib/gsc-auth.mjs)
 *
 * Cron: `0 4 * * * cd /home/sanliur/public_html && node scripts/cron/gsc-daily.mjs`
 */
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGscToken } from '../lib/gsc-auth.mjs';

const SITE_URL = 'https://sanliurfa.com/';
const SITEMAP_URL = 'https://sanliurfa.com/sitemap.xml';
const KEY_PAGES = [
  'https://sanliurfa.com/',
  'https://sanliurfa.com/gezilecek-yerler',
  'https://sanliurfa.com/yemek-tarifleri',
  'https://sanliurfa.com/etkinlikler',
  'https://sanliurfa.com/tarihi-yerler',
];

async function gscRequest(token, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        'x-goog-user-project': process.env.GOOGLE_CLOUD_PROJECT || 'sanliurfa-com-2026',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function submitSitemap(token) {
  const path = `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
  const res = await gscRequest(token, 'PUT', path);
  return res.status >= 200 && res.status < 300;
}

async function getTopQueries(token) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const fmt = d => d.toISOString().slice(0, 10);
  const path = `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await gscRequest(token, 'POST', path, {
    startDate: fmt(start),
    endDate: fmt(end),
    dimensions: ['query'],
    rowLimit: 10,
    dataState: 'final',
  });
  return res.body?.rows || [];
}

async function inspectUrl(token, url) {
  const res = await gscRequest(token, 'POST', '/v1/urlInspection/index:inspect', {
    inspectionUrl: url,
    siteUrl: SITE_URL,
    languageCode: 'tr-TR',
  });
  return res.body?.inspectionResult;
}

(async () => {
  const startedAt = new Date().toISOString();
  console.log(`[gsc-daily] start ${startedAt}`);

  let auth;
  try {
    auth = await getGscToken(['https://www.googleapis.com/auth/webmasters']);
    console.log(`[gsc-daily] auth ok via ${auth.source}`);
  } catch (e) {
    console.error('[gsc-daily] auth FAIL:', e.message);
    process.exit(1);
  }

  // 1. Sitemap re-submit
  try {
    const ok = await submitSitemap(auth.token);
    console.log(`[gsc-daily] sitemap submit: ${ok ? 'OK' : 'FAIL'}`);
  } catch (e) {
    console.error('[gsc-daily] sitemap error:', e.message);
  }

  // 2. Top queries (son 7 gün)
  try {
    const rows = await getTopQueries(auth.token);
    console.log(`[gsc-daily] top queries (last 7d):`);
    for (const r of rows) {
      console.log(`  ${r.keys[0].padEnd(40)} clicks=${r.clicks} impr=${r.impressions} ctr=${(r.ctr * 100).toFixed(1)}% pos=${r.position.toFixed(1)}`);
    }
  } catch (e) {
    console.error('[gsc-daily] top queries error:', e.message);
  }

  // 3. URL inspection (top 5 key pages)
  console.log(`[gsc-daily] URL coverage check:`);
  for (const url of KEY_PAGES) {
    try {
      const r = await inspectUrl(auth.token, url);
      const idx = r?.indexStatusResult;
      console.log(`  ${url.padEnd(50)} verdict=${idx?.verdict || '?'} coverage="${idx?.coverageState || '?'}"`);
    } catch (e) {
      console.error(`  ${url} ERR:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[gsc-daily] done ${new Date().toISOString()}`);
})().catch(e => {
  console.error('[gsc-daily] FATAL:', e.message);
  process.exit(1);
});
