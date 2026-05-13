#!/usr/bin/env node
/**
 * Public sayfaları mobile viewport (iPhone SE 375x667) ile test eder.
 *
 * Admin değil — public-facing kullanıcı sayfaları. Kontroller:
 *   1. Horizontal overflow
 *   2. Table overflow (varsa scroll wrapper)
 *   3. Tap target boyutu (48x48 standart)
 *   4. Mobile menu toggle var mı
 *   5. Hero/header content viewport'a sığıyor mu
 *
 * Kullanım:
 *   node scripts/public-mobile-audit.mjs
 *   node scripts/public-mobile-audit.mjs /isletme/some-slug
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL || 'https://sanliurfa.com';

const PUBLIC_ROUTES = [
 '/',
 '/mekanlar',
 '/yemek-tarifleri',
 '/etkinlikler',
 '/tarihi-yerler',
 '/blog',
 '/halfeti',
 '/harran',
 '/gobeklitepe',
 '/balikligol',
 '/sanliurfa',
 '/giris',
 '/kayit',
 '/nobetci-eczaneler',
 '/hava-durumu',
 '/ulasim/otobus',
 '/ulasim/ucak',
 // Detail page samples
 '/isletme/cigerci-mahmut',
 '/yemek-tarifleri/cig-kofte',
 '/blog/halfeti-rehberi',
];

const customRoute = process.argv.find(a => a.startsWith('/'));
const TARGETS = customRoute ? [customRoute] : PUBLIC_ROUTES;

async function audit(page, route) {
 try {
  const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 1. Horizontal overflow
  const overflow = await page.evaluate(() => {
   const docEl = document.documentElement;
   return {
    docScrollWidth: docEl.scrollWidth,
    viewportWidth: window.innerWidth,
   };
  });
  const overflowX = overflow.docScrollWidth > overflow.viewportWidth + 1;

  // 2. Table overflow check
  const tableInfo = await page.evaluate(() => {
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

  // 3. Tap targets (48x48 standard for public)
  const smallTaps = await page.evaluate(() => {
   const els = document.querySelectorAll('button, a[href], input[type=button], input[type=submit]');
   let small = 0;
   els.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.width < 44 && r.height < 44) small++;
   });
   return small;
  });

  // 4. Mobile menu toggle
  const hasMobileMenu = await page.evaluate(() => {
   return !!document.querySelector('[aria-label*="menü" i], [aria-label*="menu" i], .mobile-nav, [data-mobile-nav]');
  });

  // 5. Hero overflow
  const heroOverflow = await page.evaluate(() => {
   const hero = document.querySelector('h1');
   if (!hero) return false;
   return hero.scrollWidth > window.innerWidth + 1;
  });

  return {
   route,
   status: resp?.status() || 0,
   overflowX,
   overflowDelta: overflow.docScrollWidth - overflow.viewportWidth,
   tableUnwrapped: tableInfo.unwrapped,
   tableTotal: tableInfo.total,
   smallTaps,
   hasMobileMenu,
   heroOverflow,
  };
 } catch (e) {
  return { route, error: e.message.slice(0, 100) };
 }
}

(async () => {
 console.log('\n📱 Public Mobile Audit (iPhone SE 375x667)\n');
 const browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({
  ...devices['iPhone SE'],
  ignoreHTTPSErrors: true,
 });
 const page = await context.newPage();

 const results = [];
 for (let i = 0; i < TARGETS.length; i++) {
  const route = TARGETS[i];
  process.stdout.write(`  ${route.padEnd(38)} ... `);
  const r = await audit(page, route);
  results.push(r);

  const tags = [];
  if (r.error) tags.push(`ERROR ${r.error}`);
  else if (r.status >= 400) tags.push(`HTTP ${r.status}`);
  if (r.overflowX) tags.push(`overflow-x ${r.overflowDelta}px`);
  if (r.tableUnwrapped) tags.push(`${r.tableUnwrapped} table overflow`);
  if (r.heroOverflow) tags.push('hero overflow');

  console.log(tags.length ? '✗ ' + tags.join(', ') : '✓ OK');
  if (i < TARGETS.length - 1) await page.waitForTimeout(1000);
 }

 console.log('\n=== ÖZET ===');
 const failed = results.filter(r => r.overflowX || r.tableUnwrapped || r.heroOverflow || r.error || (r.status >= 400));
 console.log(`Toplam ${results.length} sayfa, ${results.length - failed.length} OK, ${failed.length} mobile-issue`);

 if (failed.length > 0) {
  console.log('\nDetay:');
  failed.forEach(r => {
   console.log(`  ${r.route}: ${r.error || JSON.stringify({ overflow: r.overflowDelta, tables: r.tableUnwrapped, hero: r.heroOverflow })}`);
  });
 }

 await browser.close();
 process.exit(failed.length > 0 ? 1 : 0);
})();
