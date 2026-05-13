#!/usr/bin/env node
/**
 * Google Search Console: Sitemap submit + status check.
 *
 * Requires: webmasters scope. Eğer scope eksikse şu komutu çalıştır:
 *   gcloud auth application-default login \
 *     --scopes=openid,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
 *
 * Kullanım:
 *   node scripts/gsc-sitemap-submit.mjs               # submit + status
 *   node scripts/gsc-sitemap-submit.mjs --status-only # sadece status
 */
import https from 'node:https';
import { getGscToken } from './lib/gsc-auth.mjs';

const SITE_URL = 'https://sanliurfa.com/';
const SITEMAP_URL = 'https://sanliurfa.com/sitemap.xml';
const ARGS = process.argv.slice(2);
const STATUS_ONLY = ARGS.includes('--status-only');

let cachedToken = null;
async function getAccessToken() {
  if (cachedToken) return cachedToken;
  const auth = await getGscToken(['https://www.googleapis.com/auth/webmasters']);
  console.log(`🔑 Auth: ${auth.source}${auth.email ? ' (' + auth.email + ')' : ''}`);
  cachedToken = auth.token;
  return cachedToken;
}

async function gscRequest(method, path, body) {
  const token = await getAccessToken();
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://searchconsole.googleapis.com');
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log(`\n🔍 GSC Sitemap Manager — ${SITE_URL}\n`);

  const siteEnc = encodeURIComponent(SITE_URL);
  const sitemapEnc = encodeURIComponent(SITEMAP_URL);

  const sitesRes = await gscRequest('GET', '/webmasters/v3/sites');
  if (sitesRes.body?.error) {
    console.error('❌ Sites list hatası:', sitesRes.body.error.message);
    if (sitesRes.body.error.message.includes('scope')) {
      console.error('\n   Çözüm: aşağıdaki komutu çalıştırın (tarayıcı açılacak):');
      console.error('   gcloud auth application-default login \\');
      console.error('     --scopes=openid,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters\n');
    }
    process.exit(1);
  }
  const sites = sitesRes.body?.siteEntry || [];
  console.log(`✓ ${sites.length} doğrulanmış property:`);
  sites.forEach(s => console.log(`  - ${s.siteUrl} (${s.permissionLevel})`));

  const matching = sites.find(s => s.siteUrl === SITE_URL || s.siteUrl === SITE_URL.replace(/\/$/, ''));
  if (!matching) {
    console.error(`\n❌ ${SITE_URL} doğrulanmış property listesinde değil!`);
    console.error('   Search Console > Property > Add Property işlemi gerekli.');
    process.exit(1);
  }

  if (!STATUS_ONLY) {
    console.log(`\n📤 Sitemap submit ediliyor: ${SITEMAP_URL}`);
    const submitRes = await gscRequest('PUT', `/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}`);
    if (submitRes.status >= 200 && submitRes.status < 300) {
      console.log(`  ✓ Submit başarılı (HTTP ${submitRes.status})`);
    } else {
      console.log(`  ✗ Submit hatası HTTP ${submitRes.status}:`, submitRes.body);
    }
  }

  console.log(`\n📊 Sitemap durumu:`);
  const statusRes = await gscRequest('GET', `/webmasters/v3/sites/${siteEnc}/sitemaps`);
  if (statusRes.body?.sitemap) {
    for (const sm of statusRes.body.sitemap) {
      console.log(`\n  📄 ${sm.path}`);
      console.log(`     Last submitted:   ${sm.lastSubmitted || 'N/A'}`);
      console.log(`     Last downloaded:  ${sm.lastDownloaded || 'N/A'}`);
      console.log(`     Is pending:       ${sm.isPending}`);
      console.log(`     Has errors:       ${(sm.errors || 0)}`);
      console.log(`     Has warnings:     ${(sm.warnings || 0)}`);
      if (sm.contents) {
        sm.contents.forEach(c => {
          console.log(`     ${c.type}: ${c.submitted} submitted, ${c.indexed || 0} indexed`);
        });
      }
    }
  } else {
    console.log('  Henüz submit edilmiş sitemap yok.');
  }

  console.log('\n');
})();
