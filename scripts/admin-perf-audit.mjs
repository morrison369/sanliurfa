#!/usr/bin/env node
/**
 * Admin sayfa performans ölçümü — DOM-ready, first-paint, network ağırlığı.
 *
 * Kullanım:
 *   node scripts/admin-perf-audit.mjs
 *   node scripts/admin-perf-audit.mjs /admin/places
 */
import { chromium } from 'playwright';
import { getAdminCredentials } from './lib/admin-script-auth.mjs';

const BASE = 'https://sanliurfa.com';
const { email: EMAIL, password: PASS } = getAdminCredentials();

const TARGETS = [
 '/admin', '/admin/places', '/admin/blog/posts', '/admin/users',
 '/admin/reviews', '/admin/dashboard', '/admin/integrations',
 '/admin/analytics', '/admin/events', '/admin/historical-sites',
 '/admin/recipes', '/admin/notifications', '/admin/manage',
];

const customRoute = process.argv.find(a => a.startsWith('/admin'));
const ROUTES = customRoute ? [customRoute] : TARGETS;

async function audit(page, route) {
 // Reset performance state
 await page.evaluate(() => performance.clearResourceTimings());

 const t0 = Date.now();
 const resp = await page.goto(BASE + route, { waitUntil: 'load', timeout: 30000 });
 const navTime = Date.now() - t0;

 // Wait extra for any deferred JS
 await page.waitForTimeout(800);

 const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource');
  const totalSize = resources.reduce((s, r) => s + (r.transferSize || 0), 0);
  const totalCount = resources.length;
  const slowResources = resources
   .filter(r => r.duration > 200)
   .sort((a, b) => b.duration - a.duration)
   .slice(0, 3)
   .map(r => ({ url: r.name.split('/').slice(-1)[0].slice(0, 40), dur: Math.round(r.duration) }));
  return {
   ttfb: Math.round(nav?.responseStart - nav?.requestStart || 0),
   domReady: Math.round(nav?.domContentLoadedEventEnd || 0),
   load: Math.round(nav?.loadEventEnd || 0),
   totalKb: Math.round(totalSize / 1024),
   resourceCount: totalCount,
   slowResources,
  };
 });

 return { route, navTime, ...metrics };
}

(async () => {
 console.log('\n⚡ Admin Performance Audit\n');
 const browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({ ignoreHTTPSErrors: true });
 const page = await context.newPage();

 await page.goto(BASE + '/giris', { waitUntil: 'domcontentloaded' });
 await page.fill('input[name="email"]', EMAIL);
 await page.fill('input[name="password"]', PASS);
 await Promise.all([
  page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
  page.click('button[type="submit"]'),
 ]);
 console.log(`✓ Login attempt done\n`);

 console.log('Route                              TTFB    DOM     Load    KB    Files');
 console.log('─'.repeat(76));

 const results = [];
 for (let i = 0; i < ROUTES.length; i++) {
  const route = ROUTES[i];
  const r = await audit(page, route);
  results.push(r);
  const tag = r.load > 3000 ? '✗' : r.load > 2000 ? '⚠' : '✓';
  console.log(
   `${tag} ${route.padEnd(33)} ${String(r.ttfb).padStart(5)}ms ${String(r.domReady).padStart(5)}ms ${String(r.load).padStart(5)}ms ${String(r.totalKb).padStart(5)} ${String(r.resourceCount).padStart(5)}`
  );
  if (i < ROUTES.length - 1) await page.waitForTimeout(800);
 }

 console.log('\n=== ÖZET ===');
 const avgLoad = Math.round(results.reduce((s, r) => s + r.load, 0) / results.length);
 const avgTTFB = Math.round(results.reduce((s, r) => s + r.ttfb, 0) / results.length);
 const avgKb = Math.round(results.reduce((s, r) => s + r.totalKb, 0) / results.length);
 const slowest = results.reduce((a, b) => b.load > a.load ? b : a);
 console.log(`Ortalama TTFB:  ${avgTTFB}ms`);
 console.log(`Ortalama Load:  ${avgLoad}ms`);
 console.log(`Ortalama Boyut: ${avgKb} KB`);
 console.log(`En yavaş:       ${slowest.route} (${slowest.load}ms)`);

 // Top slow resources across all pages
 const allSlow = results.flatMap(r => r.slowResources.map(s => ({ ...s, route: r.route })));
 const topSlow = allSlow.sort((a, b) => b.dur - a.dur).slice(0, 5);
 console.log('\nEn yavaş 5 kaynak:');
 topSlow.forEach(s => console.log(`  ${String(s.dur).padStart(5)}ms  ${s.url}  (${s.route})`));

 await browser.close();
})();
