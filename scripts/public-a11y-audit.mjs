#!/usr/bin/env node
/**
 * Public sayfaları aXe ile WCAG 2.1 AA accessibility audit eder.
 *
 * Kontroller:
 *   - Color contrast
 *   - ARIA roles ve attribute'lar
 *   - Form label association
 *   - Image alt text
 *   - Keyboard navigation
 *   - Landmarks (header/nav/main/footer)
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.BASE_URL || 'https://sanliurfa.com';

const TARGETS = [
  '/',
  '/mekanlar',
  '/blog',
  '/yemek-tarifleri',
  '/etkinlikler',
  '/tarihi-yerler',
  '/halfeti',
  '/gobeklitepe',
  '/giris',
  '/kayit',
];

const customRoute = process.argv.find(a => a.startsWith('/'));
const ROUTES = customRoute ? [customRoute] : TARGETS;

(async () => {
  console.log('\n♿ Public A11y Audit (axe-core WCAG 2.1 AA)\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  let totalCrit = 0, totalSerious = 0, totalMod = 0, totalMinor = 0;
  const summary = [];

  for (const route of ROUTES) {
    process.stdout.write(`  ${route.padEnd(25)} ... `);
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      const axe = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
      const results = await axe.analyze();

      const crit = results.violations.filter(v => v.impact === 'critical');
      const serious = results.violations.filter(v => v.impact === 'serious');
      const mod = results.violations.filter(v => v.impact === 'moderate');
      const minor = results.violations.filter(v => v.impact === 'minor');

      totalCrit += crit.length;
      totalSerious += serious.length;
      totalMod += mod.length;
      totalMinor += minor.length;

      const tags = [];
      if (crit.length) tags.push(`CRIT:${crit.length}`);
      if (serious.length) tags.push(`SERIOUS:${serious.length}`);
      if (mod.length) tags.push(`mod:${mod.length}`);

      console.log(tags.length ? '✗ ' + tags.join(' ') : '✓ OK');

      summary.push({ route, status: resp?.status() || 0, crit, serious, mod, minor });
    } catch (e) {
      console.log('ERR', e.message.slice(0, 60));
      summary.push({ route, error: e.message.slice(0, 100) });
    }
    await page.waitForTimeout(500);
  }

  console.log(`\n=== ÖZET ===`);
  console.log(`Critical:  ${totalCrit}`);
  console.log(`Serious:   ${totalSerious}`);
  console.log(`Moderate:  ${totalMod}`);
  console.log(`Minor:     ${totalMinor}`);

  console.log('\n=== Top issues by route ===');
  for (const s of summary) {
    if (s.error) { console.log(`  ${s.route}: ERR ${s.error}`); continue; }
    if (s.crit.length || s.serious.length) {
      console.log(`  ${s.route}:`);
      [...s.crit, ...s.serious].forEach(v => {
        console.log(`    [${v.impact}] ${v.id}: ${v.description.slice(0, 80)}`);
        v.nodes.slice(0, 2).forEach(n => {
          console.log(`      → ${(n.target || []).join(' ').slice(0, 80)}`);
        });
      });
    }
  }

  await browser.close();
  process.exit((totalCrit + totalSerious) > 0 ? 1 : 0);
})();
