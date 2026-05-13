#!/usr/bin/env node
/**
 * GSC URL Inspection API: belirli URL'lerin Google index durumunu kontrol.
 *
 * Quota: günde 2000 URL inspect (free tier).
 * Daily Limit per property: ~2000 inspect, ~2000 search analytics query.
 *
 * Kullanım:
 *   node scripts/gsc-url-inspect.mjs                                 # default critical URLs
 *   node scripts/gsc-url-inspect.mjs https://sanliurfa.com/X         # custom URL
 *
 * Requires: webmasters.readonly scope.
 */
import https from 'node:https';
import { getGscToken } from './lib/gsc-auth.mjs';

const SITE_URL = 'https://sanliurfa.com/';
const CUSTOM_URLS = process.argv.slice(2).filter(a => a.startsWith('http'));

const DEFAULT_URLS = [
  'https://sanliurfa.com/',
  'https://sanliurfa.com/kunye',
  'https://sanliurfa.com/yazarlar',
  'https://sanliurfa.com/hakkinda',
  'https://sanliurfa.com/blog',
  'https://sanliurfa.com/mekanlar',
  'https://sanliurfa.com/etkinlikler',
  'https://sanliurfa.com/tarihi-yerler/gobeklitepe',
  'https://sanliurfa.com/yemek-tarifleri/urfa-kebabi',
  'https://sanliurfa.com/blog/gobeklitepe-rehberi-ziyaret-bilgileri',
];

const URLS = CUSTOM_URLS.length > 0 ? CUSTOM_URLS : DEFAULT_URLS;

async function getAccessToken() {
  const auth = await getGscToken(['https://www.googleapis.com/auth/webmasters.readonly']);
  console.log(`🔑 Auth: ${auth.source}${auth.email ? ' (' + auth.email + ')' : ''}`);
  return auth.token;
}

function inspectUrl(token, inspectionUrl) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      inspectionUrl,
      siteUrl: SITE_URL,
      languageCode: 'tr-TR',
    });
    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: '/v1/urlInspection/index:inspect',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    req.setTimeout(30000, () => { req.destroy(); resolve({ status: 0, body: null }); });
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log(`\n🔍 GSC URL Inspection — ${URLS.length} URL\n`);
  const token = await getAccessToken();

  for (const url of URLS) {
    const res = await inspectUrl(token, url);
    if (res.body?.error) {
      console.log(`  ✗ ${url}\n    Error: ${res.body.error.message}`);
      if (res.body.error.message?.includes('scope')) {
        console.error('\nÇözüm: gcloud auth application-default login --scopes=...,webmasters');
        process.exit(1);
      }
      continue;
    }
    const r = res.body?.inspectionResult || {};
    const index = r.indexStatusResult || {};
    const mobile = r.mobileUsabilityResult || {};
    const rich = r.richResultsResult || {};

    const verdict = index.verdict || 'UNKNOWN';
    const icon = verdict === 'PASS' ? '✓' : verdict === 'FAIL' ? '✗' : '⚠';
    console.log(`  ${icon} ${url}`);
    console.log(`     Verdict:           ${verdict}`);
    console.log(`     Coverage state:    ${index.coverageState || 'N/A'}`);
    console.log(`     Last crawl time:   ${index.lastCrawlTime || 'never'}`);
    console.log(`     Robots.txt status: ${index.robotsTxtState || 'N/A'}`);
    console.log(`     Indexing state:    ${index.indexingState || 'N/A'}`);
    console.log(`     Mobile usability:  ${mobile.verdict || 'N/A'}`);
    if (rich.detectedItems?.length) {
      console.log(`     Rich results:      ${rich.detectedItems.map(i => i.richResultType).join(', ')}`);
    }
    if (index.referringUrls?.length) {
      console.log(`     Inbound links:     ${index.referringUrls.length}`);
    }
    console.log('');
  }

  console.log(`\n${URLS.length} URL inspect tamamlandı.`);
})();
