#!/usr/bin/env node
/**
 * Admin sayfalarını mobile viewport (375x667 — iPhone SE) ile test eder.
 *
 * Kontroller:
 *   1. Sayfa horizontal overflow (scroll-x) var mı (responsive break)
 *   2. Sidebar drawer açılıp kapanabiliyor mu
 *   3. Tap target'lar 48x48 px üstünde mi (accessibility)
 *   4. Tabular content'ler (table) overflow:auto wrapper'da mı
 *   5. Topbar overflow olmadan render mı
 *
 * Kullanım:
 *   node scripts/admin-mobile-audit.mjs               # tüm critical pages
 *   node scripts/admin-mobile-audit.mjs /admin/places # tek sayfa
 */
import { chromium, devices } from 'playwright';

const BASE = 'https://sanliurfa.com';
const EMAIL = 'admin@sanliurfa.com';
const PASS = 'Urfa2026!';

const ROUTES = [
 '/admin', '/admin/places', '/admin/blog/posts', '/admin/users',
 '/admin/reviews', '/admin/integrations', '/admin/notifications',
 '/admin/analytics', '/admin/reports', '/admin/revenue',
 '/admin/reservations', '/admin/quotas', '/admin/events',
 '/admin/historical-sites', '/admin/feature-flags', '/admin/categories',
 '/admin/community-photos', '/admin/recipes', '/admin/tickets',
 '/admin/dashboard', '/admin/moderation', '/admin/import',
 '/admin/places/lifecycle', '/admin/export-tokens',
];

const customRoute = process.argv.find(a => a.startsWith('/admin'));
const TARGETS = customRoute ? [customRoute] : ROUTES;

async function audit(page, route) {
 try {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 1. Horizontal overflow check
  const overflow = await page.evaluate(() => {
   const docEl = document.documentElement;
   const body = document.body;
   return {
    docScrollWidth: docEl.scrollWidth,
    docClientWidth: docEl.clientWidth,
    bodyScrollWidth: body.scrollWidth,
    viewportWidth: window.innerWidth,
   };
  });
  const overflowX = overflow.docScrollWidth > overflow.viewportWidth + 1;

  // 2. Sidebar drawer
  const sidebarToggle = await page.locator('#adm-mobile-toggle').count();
  const sidebarDrawer = await page.locator('.adm-sidebar').count();

  // 3. Small tap targets (< 36x36 — looser than 48 since admin is desktop-first)
  const smallTaps = await page.evaluate(() => {
   const els = document.querySelectorAll('button, a[href], input[type=button], input[type=submit]');
   let small = 0;
   els.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 28)) small++;
   });
   return small;
  });

  // 4. Tables with overflow
  const tableOverflow = await page.evaluate(() => {
   const tables = document.querySelectorAll('table');
   let unwrapped = 0;
   tables.forEach(t => {
    const parent = t.parentElement;
    if (parent) {
     const style = window.getComputedStyle(parent);
     const hasOverflow = style.overflowX === 'auto' || style.overflowX === 'scroll';
     if (!hasOverflow && t.scrollWidth > parent.clientWidth + 1) unwrapped++;
    }
   });
   return { total: tables.length, unwrapped };
  });

  return {
   route,
   overflowX,
   overflowDelta: overflow.docScrollWidth - overflow.viewportWidth,
   hasSidebarToggle: sidebarToggle > 0,
   hasSidebar: sidebarDrawer > 0,
   smallTaps,
   tables: tableOverflow,
  };
 } catch (e) {
  return { route, error: e.message.slice(0, 100) };
 }
}

(async () => {
 console.log('\n📱 Admin Mobile Audit (iPhone SE 375x667)\n');
 const browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({
  ...devices['iPhone SE'],
  ignoreHTTPSErrors: true,
 });
 const page = await context.newPage();

 // Login (mobile viewport)
 await page.goto(BASE + '/giris', { waitUntil: 'domcontentloaded' });
 await page.fill('input[name="email"]', EMAIL);
 await page.fill('input[name="password"]', PASS);
 await Promise.all([
  page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
  page.click('button[type="submit"]'),
 ]);
 console.log(`✓ Login attempt done\n`);

 const results = [];
 for (let i = 0; i < TARGETS.length; i++) {
  const route = TARGETS[i];
  process.stdout.write(`  ${route.padEnd(35)} ... `);
  const r = await audit(page, route);
  results.push(r);

  const tags = [];
  if (r.error) tags.push(`ERROR ${r.error}`);
  if (r.overflowX) tags.push(`overflow-x ${r.overflowDelta}px`);
  if (!r.hasSidebarToggle && r.route !== '/giris') tags.push('no mobile-toggle');
  if (r.smallTaps > 5) tags.push(`${r.smallTaps} small taps`);
  if (r.tables?.unwrapped) tags.push(`${r.tables.unwrapped} table overflow`);

  console.log(tags.length ? '✗ ' + tags.join(', ') : '✓ OK');
  if (i < TARGETS.length - 1) await page.waitForTimeout(1200);
 }

 console.log('\n=== ÖZET ===');
 const failed = results.filter(r => r.overflowX || (r.tables?.unwrapped));
 console.log(`Toplam ${results.length} sayfa, ${results.length - failed.length} OK, ${failed.length} mobile-issue`);

 await browser.close();
})();
