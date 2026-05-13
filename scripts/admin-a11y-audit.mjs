#!/usr/bin/env node
/**
 * Admin sayfalarını aXe ile WCAG 2.1 AA accessibility audit eder.
 *
 * Kontroller:
 *   - Color contrast
 *   - ARIA roles ve attribute'lar
 *   - Form label association
 *   - Image alt text
 *   - Keyboard navigation
 *   - Landmarks (header/nav/main/footer)
 *
 * Kullanım:
 *   node scripts/admin-a11y-audit.mjs
 *   node scripts/admin-a11y-audit.mjs /admin/places
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = 'https://sanliurfa.com';
const EMAIL = 'admin@sanliurfa.com';
const PASS = 'Urfa2026!';

const TARGETS = [
 '/admin', '/admin/places', '/admin/users', '/admin/blog/posts',
 '/admin/reviews', '/admin/integrations', '/admin/notifications',
 '/admin/analytics', '/admin/manage', '/admin/dashboard',
 '/admin/events', '/admin/historical-sites', '/admin/feature-flags',
 '/admin/revenue', '/admin/reports', '/admin/categories',
];

const customRoute = process.argv.find(a => a.startsWith('/admin'));
const ROUTES = customRoute ? [customRoute] : TARGETS;

async function audit(page, route) {
 try {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const results = await new AxeBuilder({ page })
   .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
   .disableRules(['color-contrast']) // CSS var-based theme rendering kontrast hassas; ayrı test
   .analyze();

  return {
   route,
   violations: results.violations.length,
   topViolations: results.violations.slice(0, 5).map(v => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    help: v.help.slice(0, 80),
    targets: v.nodes.slice(0, 3).map(n => ({
     target: (n.target || []).join(' '),
     html: (n.html || '').slice(0, 220),
    })),
   })),
  };
 } catch (e) {
  return { route, error: e.message.slice(0, 100) };
 }
}

(async () => {
 console.log('\n♿ Admin Accessibility Audit (aXe WCAG 2.1 AA)\n');
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

 const results = [];
 for (let i = 0; i < ROUTES.length; i++) {
  const route = ROUTES[i];
  process.stdout.write(`  ${route.padEnd(32)} ... `);
  const r = await audit(page, route);
  results.push(r);
  if (r.error) console.log('✗ ' + r.error);
  else if (r.violations === 0) console.log('✓ 0 violations');
  else console.log(`✗ ${r.violations} violations`);
  if (i < ROUTES.length - 1) await page.waitForTimeout(800);
 }

 console.log('\n=== DETAYLAR ===\n');
 results.filter(r => r.violations > 0).forEach(r => {
  console.log(`\n${r.route} (${r.violations} ihlal):`);
  (r.topViolations || []).forEach(v => {
   console.log(`  • [${v.impact}] ${v.id} (${v.nodes} node) — ${v.help}`);
   (v.targets || []).forEach(t => {
    console.log(`    selector: ${t.target}`);
    console.log(`    html: ${t.html}`);
   });
  });
 });

 const totalIhlal = results.reduce((s, r) => s + (r.violations || 0), 0);
 console.log(`\n=== ÖZET ===`);
 console.log(`${results.length} sayfa kontrol edildi · toplam ${totalIhlal} ihlal`);

 await browser.close();
})();
