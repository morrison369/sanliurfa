#!/usr/bin/env node
/**
 * GSC Search Analytics: son N günde gelen sorgu/sayfa/ülke/cihaz dağılımı.
 *
 * Kullanım:
 *   node scripts/gsc-search-analytics.mjs                    # son 28 gün, top 50 query
 *   node scripts/gsc-search-analytics.mjs --days=7           # son 7 gün
 *   node scripts/gsc-search-analytics.mjs --dim=page         # query yerine page
 *   node scripts/gsc-search-analytics.mjs --dim=country
 *   node scripts/gsc-search-analytics.mjs --limit=100
 *
 * Requires: webmasters.readonly scope. Property User permission gerek.
 */
import https from 'node:https';
import { getGscToken } from './lib/gsc-auth.mjs';

const SITE_URL = 'https://sanliurfa.com/';
const ARGS = process.argv.slice(2);

const days = parseInt(ARGS.find(a => a.startsWith('--days='))?.split('=')[1] || '28', 10);
const dim = ARGS.find(a => a.startsWith('--dim='))?.split('=')[1] || 'query';
const limit = parseInt(ARGS.find(a => a.startsWith('--limit='))?.split('=')[1] || '50', 10);

const VALID_DIMS = ['query', 'page', 'country', 'device', 'date', 'searchAppearance'];
if (!VALID_DIMS.includes(dim)) {
  console.error(`Geçersiz --dim: ${dim}\nKullanılabilir: ${VALID_DIMS.join(', ')}`);
  process.exit(1);
}

const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);

function fmt(d) { return d.toISOString().slice(0, 10); }

async function searchAnalytics(token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: [dim],
      rowLimit: limit,
      dataState: 'final',
    });
    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
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
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log(`\n🔎 GSC Search Analytics — son ${days} gün, dim=${dim}, limit=${limit}\n`);
  const auth = await getGscToken(['https://www.googleapis.com/auth/webmasters.readonly']);
  console.log(`🔑 Auth: ${auth.source}${auth.email ? ' (' + auth.email + ')' : ''}\n`);

  const res = await searchAnalytics(auth.token);
  if (res.body?.error) {
    console.error('❌ Hata:', res.body.error.message);
    if (res.body.error.code === 403) {
      console.error('   SA henüz Search Console property\'sinde User olarak ekli değil.');
      console.error(`   URL: https://search.google.com/search-console/users?resource_id=${encodeURIComponent(SITE_URL)}`);
    }
    process.exit(1);
  }

  const rows = res.body?.rows || [];
  if (rows.length === 0) {
    console.log('  Veri yok. Property doğru ve son ' + days + ' günde trafik var mı?');
    return;
  }

  console.log(`  ${dim.padEnd(50)} | Clicks  | Impressions | CTR     | Position`);
  console.log('  ' + '-'.repeat(50) + '-|---------|-------------|---------|---------');
  for (const r of rows) {
    const key = String(r.keys[0]).slice(0, 48).padEnd(50);
    const clicks = String(r.clicks).padStart(7);
    const impr = String(r.impressions).padStart(11);
    const ctr = (r.ctr * 100).toFixed(2).padStart(6) + '%';
    const pos = r.position.toFixed(1).padStart(8);
    console.log(`  ${key} | ${clicks} | ${impr} | ${ctr} | ${pos}`);
  }

  console.log(`\n  ${rows.length} satır`);

  // Summary
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpr = rows.reduce((s, r) => s + r.impressions, 0);
  const avgCtr = totalImpr > 0 ? (totalClicks / totalImpr * 100).toFixed(2) : '0';
  console.log(`  Toplam: ${totalClicks} tıklama, ${totalImpr} gösterim, %${avgCtr} CTR\n`);
})();
