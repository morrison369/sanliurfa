import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        window.__shifts.push({
          value: entry.value,
          sources: (entry.sources || []).map(s => ({
            tag: s.node?.tagName, cls: (s.node?.className || '').toString().slice(0, 80), id: s.node?.id || '',
          })),
        });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
});
await page.goto('https://sanliurfa.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);
const shifts = await page.evaluate(() => window.__shifts || []);
const total = shifts.reduce((s, x) => s + x.value, 0);
console.log(`Total CLS: ${total.toFixed(4)}`);
console.log(`Number of shifts: ${shifts.length}\n`);
shifts.sort((a, b) => b.value - a.value).slice(0, 5).forEach((s, i) => {
  console.log(`${i+1}. value=${s.value.toFixed(4)}`);
  s.sources.slice(0, 3).forEach(src => console.log(`   ${src.tag} ${src.id ? '#'+src.id : ''} ${src.cls.slice(0,70)}`));
});
await browser.close();
