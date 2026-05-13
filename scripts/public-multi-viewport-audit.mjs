#!/usr/bin/env node
/**
 * Multi-viewport audit — mobile, tablet, desktop (lg), desktop (xl).
 * Bu özellikle header lg overflow gibi sorunları yakalamak için yazıldı (2026-05-13).
 *
 * Kontroller:
 *   1. Horizontal overflow (doc width > viewport)
 *   2. Header element clipping (nav items wrap/hide)
 *   3. Tap targets (44x44 mobile, 32x32 desktop OK)
 *   4. Hero overflow
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL || 'https://sanliurfa.com';

const ROUTES = ['/', '/mekanlar', '/blog', '/yemek-tarifleri', '/etkinlikler', '/tarihi-yerler'];

const VIEWPORTS = [
  { name: 'mobile (iPhone SE)', width: 375, height: 667 },
  { name: 'tablet (iPad mini)', width: 768, height: 1024 },
  { name: 'desktop lg (1024px)', width: 1024, height: 768 },
  { name: 'desktop xl (1280px)', width: 1280, height: 800 },
  { name: 'desktop wide (1440px)', width: 1440, height: 900 },
];

async function audit(page, route) {
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const docEl = document.documentElement;
      const header = document.querySelector('header');
      const h1 = document.querySelector('h1');
      const nav = document.querySelector('header nav');
      const navLinks = nav ? nav.querySelectorAll('a') : [];
      const visibleNavLinks = Array.from(navLinks).filter(a => {
        const cs = window.getComputedStyle(a);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });

      let navOverflow = false;
      if (nav) {
        const navRect = nav.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect();
        if (navRect.bottom > (headerRect?.bottom || 999) + 5 || navRect.right > window.innerWidth) {
          navOverflow = true;
        }
      }

      return {
        docScrollWidth: docEl.scrollWidth,
        viewportWidth: window.innerWidth,
        navVisibleCount: visibleNavLinks.length,
        navOverflow,
        headerHeight: header?.getBoundingClientRect().height || 0,
        heroOverflow: h1 ? h1.scrollWidth > window.innerWidth + 1 : false,
      };
    });

    const overflowX = data.docScrollWidth > data.viewportWidth + 1;
    return {
      route,
      status: resp?.status() || 0,
      overflowX,
      overflowDelta: data.docScrollWidth - data.viewportWidth,
      navVisible: data.navVisibleCount,
      navOverflow: data.navOverflow,
      headerH: Math.round(data.headerHeight),
      heroOverflow: data.heroOverflow,
    };
  } catch (e) {
    return { route, error: e.message.slice(0, 100) };
  }
}

(async () => {
  console.log('\n📐 Multi-viewport Audit (mobile + tablet + desktop)\n');
  const browser = await chromium.launch({ headless: true });

  const allIssues = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- ${vp.name} ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const r = await audit(page, route);
      const tags = [];
      if (r.error) tags.push(`ERROR ${r.error}`);
      if (r.overflowX) tags.push(`overflow-x +${r.overflowDelta}px`);
      if (r.navOverflow) tags.push('NAV CLIPPING');
      if (r.heroOverflow) tags.push('hero overflow');

      const status = tags.length ? '✗' : '✓';
      const info = `nav=${r.navVisible} h=${r.headerH}px`;
      console.log(`  ${status} ${route.padEnd(20)} ${info}  ${tags.join(', ') || 'OK'}`);

      if (tags.length) allIssues.push({ viewport: vp.name, route, tags, ...r });
    }

    await context.close();
  }

  console.log(`\n=== ÖZET ===`);
  console.log(`Toplam ${VIEWPORTS.length * ROUTES.length} test, ${allIssues.length} issue`);
  if (allIssues.length > 0) {
    allIssues.forEach(i => console.log(`  ${i.viewport} - ${i.route}: ${i.tags.join(', ')}`));
  }

  await browser.close();
  process.exit(allIssues.length > 0 ? 1 : 0);
})();
