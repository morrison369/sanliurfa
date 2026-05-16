#!/usr/bin/env node
/**
 * Admin sayfalarını gerçek browser ile audit eder (Playwright).
 *
 * Her sayfa için kontroller:
 *   1. HTTP status 200 mü
 *   2. 3 saniye sonra DOM'da "Yükleniyor..." hala var mı (script bozuk)
 *   3. Console error var mı
 *   4. Network 4xx/5xx fail var mı (özellikle /api/admin/...)
 *   5. Stat sayıları "-" yerine gerçek değer mi
 *
 * Kullanım:
 *   node scripts/admin-browser-audit.mjs                  # tüm kritik sayfa
 *   node scripts/admin-browser-audit.mjs /admin/places    # tek sayfa
 */
import { chromium } from 'playwright';
import { getAdminCredentials } from './lib/admin-script-auth.mjs';

const BASE = 'https://sanliurfa.com';
const { email: EMAIL, password: PASS } = getAdminCredentials();

const CRITICAL_ROUTES = [
 '/admin', '/admin/analytics', '/admin/api-docs', '/admin/audit-logs',
 '/admin/blog', '/admin/blog/posts', '/admin/blog/new', '/admin/blog/add', '/admin/blog/analytics', '/admin/blog/comments', '/admin/blog/content-bot',
 '/admin/campaigns', '/admin/categories', '/admin/claims', '/admin/community-photos',
 '/admin/component-gallery', '/admin/content-agents', '/admin/content-generator', '/admin/dashboard',
 '/admin/events', '/admin/events/add', '/admin/export-tokens', '/admin/feature-flags',
 '/admin/governance', '/admin/historical-sites', '/admin/historical-sites/add', '/admin/import',
 '/admin/integrations', '/admin/loyalty', '/admin/manage', '/admin/messages',
 '/admin/moderation', '/admin/monitoring', '/admin/notifications', '/admin/performance',
 '/admin/pharmacies', '/admin/places', '/admin/places/add', '/admin/places/lifecycle',
 '/admin/quotas', '/admin/recipes', '/admin/release-readiness', '/admin/reports',
 '/admin/reservations', '/admin/revenue', '/admin/reviews', '/admin/settings/marketing',
 '/admin/site-audit', '/admin/site-content', '/admin/social-events', '/admin/social-policies',
 '/admin/social-risk', '/admin/subscriptions', '/admin/tickets', '/admin/ulasim',
 '/admin/user-deletions', '/admin/users', '/admin/vendor-approval', '/admin/verifications',
 '/admin/webhooks',
];

const customRoute = process.argv.find(a => a.startsWith('/admin'));
const ROUTES = customRoute ? [customRoute] : CRITICAL_ROUTES;

async function audit(page, route) {
 const consoleErrors = [];
 const networkErrors = [];

 const consoleHandler = (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 150));
 };
 const responseHandler = (res) => {
  if (res.status() >= 400 && res.url().includes('/api/')) {
   networkErrors.push(`${res.status()} ${new URL(res.url()).pathname}`);
  }
 };

 page.on('console', consoleHandler);
 page.on('response', responseHandler);

 try {
  const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3500); // give scripts time to fetch

  const status = resp?.status() || 0;
  const stuckLoading = await page.locator('text=/^Yükleniyor\\.\\.\\.$/').count();
  const dashStats = await page.locator('[id^="stat"]').allTextContents().catch(() => []);
  const emptyStats = dashStats.filter(t => t.trim() === '-' || t.trim() === '').length;
  const title = await page.title();

  return {
   route, status, stuckLoading, emptyStats,
   title: title.slice(0, 60),
   consoleErrors: consoleErrors.slice(0, 5),
   networkErrors: networkErrors.slice(0, 5),
  };
 } catch (e) {
  return { route, status: 0, error: e.message.slice(0, 100), consoleErrors, networkErrors };
 } finally {
  page.off('console', consoleHandler);
  page.off('response', responseHandler);
 }
}

(async () => {
 console.log('\n🔍 Admin Browser Audit\n');
 const browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({ ignoreHTTPSErrors: true });
 const page = await context.newPage();

 // Login
 await page.goto(BASE + '/giris', { waitUntil: 'domcontentloaded' });
 await page.fill('input[name="email"]', EMAIL);
 await page.fill('input[name="password"]', PASS);
 await Promise.all([
  page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
  page.click('button[type="submit"]'),
 ]);

 const sessionOk = await page.locator('text=admin').count().catch(() => 0);
 console.log(`✓ Login attempt done\n`);

 const results = [];
 for (let i = 0; i < ROUTES.length; i++) {
  const route = ROUTES[i];
  process.stdout.write(`  ${route.padEnd(35)} ... `);
  const r = await audit(page, route);
  results.push(r);
  if (i < ROUTES.length - 1) await page.waitForTimeout(1500); // rate-limit cooldown
  const tags = [];
  if (r.status !== 200) tags.push(`HTTP ${r.status}`);
  if (r.stuckLoading) tags.push(`${r.stuckLoading}x Yükleniyor stuck`);
  if (r.emptyStats > 0) tags.push(`${r.emptyStats} empty stat`);
  if (r.consoleErrors?.length) tags.push(`${r.consoleErrors.length} console err`);
  if (r.networkErrors?.length) tags.push(`${r.networkErrors.length} api err`);
  console.log(tags.length ? '✗ ' + tags.join(', ') : '✓ OK');
 }

 console.log('\n=== DETAYLI HATALAR ===\n');
 results.filter(r => r.consoleErrors?.length || r.networkErrors?.length || r.stuckLoading || r.emptyStats).forEach(r => {
  console.log(`\n${r.route}`);
  if (r.networkErrors?.length) {
   console.log('  API hataları:');
   r.networkErrors.forEach(e => console.log(`    ✗ ${e}`));
  }
  if (r.consoleErrors?.length) {
   console.log('  Console:');
   r.consoleErrors.forEach(e => console.log(`    ⚠ ${e}`));
  }
 });

 await browser.close();
})();
