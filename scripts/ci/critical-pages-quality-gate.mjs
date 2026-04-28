#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'critical-pages-quality-report.json');
const outMd = path.join(root, 'docs', 'critical-pages-quality-report.md');

const pages = [
  { route: '/', file: 'src/pages/index.astro', imageSlug: 'gobeklitepe' },
  { route: '/mekanlar', file: 'src/pages/mekanlar/index.astro', imageSlug: 'balikligol' },
  { route: '/saglik/nobetci-eczaneler', file: 'src/pages/saglik/nobetci-eczaneler.astro' },
  { route: '/ulasim/otobus-saatleri', file: 'src/pages/ulasim/otobus-saatleri.astro' },
  { route: '/ulasim/ucak-saatleri', file: 'src/pages/ulasim/ucak-saatleri.astro' },
  { route: '/yemek-tarifleri', file: 'src/pages/yemek-tarifleri/index.astro', imageSlug: 'cigerci-aziz-usta' },
  { route: '/etkinlikler', file: 'src/pages/etkinlikler/index.astro', imageSlug: 'sanliurfa-kultur-festivali' },
  { route: '/ilceler', file: 'src/pages/ilceler/index.astro', imageSlug: 'harran' },
  { route: '/blog', file: 'src/pages/blog/index.astro', imageSlug: 'tarihi-yerler-rehberi' },
  { route: '/topluluk', file: 'src/pages/topluluk.astro' },
];

let manifest = [];
try {
  manifest = JSON.parse(readFileSync(path.join(root, 'public', 'images', 'image-manifest.json'), 'utf8'));
} catch {}
const manifestSlugs = new Set(Array.isArray(manifest) ? manifest.map((item) => item.slug) : []);

const checks = pages.map((page) => {
  const filePath = path.join(root, page.file);
  const exists = existsSync(filePath);
  const content = exists ? readFileSync(filePath, 'utf8') : '';
  const hasTurkishSignal = /Şanlıurfa|Sanliurfa|Urfa|Göbeklitepe|Balıklıgöl/.test(content);
  const hasSeoSignal = /canonical|schema|FAQ|SSS|seo=|structured/i.test(content);
  const imageOk = !page.imageSlug || manifestSlugs.has(page.imageSlug);
  const status = exists && hasTurkishSignal && hasSeoSignal && imageOk ? 'ok' : 'blocked';
  return {
    route: page.route,
    file: page.file,
    status,
    fileExists: exists,
    turkishSignal: hasTurkishSignal,
    seoSignal: hasSeoSignal,
    requiredImageSlug: page.imageSlug || null,
    imageOk,
  };
});

const blocked = checks.filter((item) => item.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: blocked.length > 0 ? 'blocked' : 'ok',
  checks,
  totals: { ok: checks.length - blocked.length, blocked: blocked.length },
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Critical Pages Quality Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- OK: ${report.totals.ok}`,
    `- Blocked: ${report.totals.blocked}`,
    '',
    '| Route | Status | File | Image |',
    '|---|---|---|---|',
    ...checks.map((item) => `| ${item.route} | ${item.status} | \`${item.file}\` | ${item.requiredImageSlug || '-'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Critical pages quality written: ${outJson}`);
console.log(`Critical pages quality written: ${outMd}`);
if (blocked.length > 0) {
  for (const item of blocked) {
    console.error(`Critical page failed: ${item.route}`);
  }
  process.exit(1);
}
