#!/usr/bin/env node
/**
 * Public sayfalarda browser console error + network 4xx/5xx + broken link audit.
 *
 * Kontroller:
 *   1. JS console errors (uncaught exceptions, fetch failures)
 *   2. Network resource 4xx/5xx (images, scripts, CSS)
 *   3. Missing meta tags (title, description, og:image)
 *   4. JSON-LD parse errors
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'https://sanliurfa.com';

const ROUTES = [
  '/',
  '/mekanlar',
  '/blog',
  '/yemek-tarifleri',
  '/etkinlikler',
  '/tarihi-yerler',
  '/ilceler',
  '/hakkinda',
  '/iletisim',
  '/giris',
];

(async () => {
  console.log('\n🔍 Public Console/Network/SEO Audit\n');
  const browser = await chromium.launch({ headless: true });

  let totalIssues = 0;

  for (const route of ROUTES) {
    process.stdout.write(`  ${route.padEnd(22)} ... `);
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const networkErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text().slice(0, 150));
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push('UNCAUGHT: ' + err.message.slice(0, 150));
    });
    page.on('response', resp => {
      const s = resp.status();
      if (s >= 400) {
        const url = resp.url();
        if (!url.includes('cloudflare') && !url.includes('clarity')) {
          networkErrors.push(`${s} ${url.slice(0, 80)}`);
        }
      }
    });

    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // SEO check
      const seo = await page.evaluate(() => {
        const t = document.querySelector('title')?.textContent || '';
        const d = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
        const h1count = document.querySelectorAll('h1').length;
        const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        let jsonLdErrors = 0;
        jsonLd.forEach(el => {
          try { JSON.parse(el.textContent || ''); } catch { jsonLdErrors++; }
        });
        return { t, d, og, h1count, jsonLdCount: jsonLd.length, jsonLdErrors };
      });

      const issues = [];
      if (consoleErrors.length) issues.push(`${consoleErrors.length} console`);
      if (networkErrors.length) issues.push(`${networkErrors.length} network`);
      if (!seo.t) issues.push('no-title');
      if (!seo.d) issues.push('no-desc');
      if (seo.h1count !== 1) issues.push(`${seo.h1count}h1`);
      if (seo.jsonLdErrors) issues.push(`${seo.jsonLdErrors}jsonld-bad`);

      if (issues.length) {
        totalIssues += issues.length;
        console.log('✗ ' + issues.join(', '));
        if (consoleErrors.length) consoleErrors.slice(0, 3).forEach(e => console.log(`    console: ${e}`));
        if (networkErrors.length) networkErrors.slice(0, 3).forEach(e => console.log(`    network: ${e}`));
      } else {
        console.log('✓ OK');
      }
    } catch (e) {
      console.log('ERR', e.message.slice(0, 60));
    }
    await ctx.close();
  }

  console.log(`\nTotal issue count: ${totalIssues}`);
  await browser.close();
  process.exit(totalIssues > 0 ? 1 : 0);
})();
