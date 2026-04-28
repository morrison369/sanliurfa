#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'src/pages/llms.txt.ts',
  'src/pages/sitemap.xml.ts',
  'src/pages/sitemap-dynamic.xml.ts',
  'src/pages/robots.txt.ts',
];

const missing = required.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('[seo-geo-gate] Missing required SEO/GEO surfaces:');
  for (const p of missing) console.error(` - ${p}`);
  process.exit(1);
}

const llms = readFileSync('src/pages/llms.txt.ts', 'utf8');
const robots = readFileSync('src/pages/robots.txt.ts', 'utf8');
const sitemap = readFileSync('src/pages/sitemap.xml.ts', 'utf8');
const dynamicSitemap = readFileSync('src/pages/sitemap-dynamic.xml.ts', 'utf8');

const llmsSignals = [
  'Şanlıurfa',
  'Şanlıurfa yemek tarifleri',
  'Şanlıurfa nöbetçi eczaneler',
  '/ilceler',
  '/yemek-tarifleri',
  '/ulasim/otobus-saatleri',
  '/ulasim/ucak-saatleri',
  '/etkinlikler',
  '/mekanlar',
  '/topluluk',
  '/eslesme',
  '/isletme-kayit',
  'admin onayı',
];

const robotSignals = ['Sitemap:', 'GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot'];
const sitemapSignals = [
  '/',
  '/mekanlar',
  '/ilceler',
  '/yemek-tarifleri',
  '/saglik/nobetci-eczaneler',
  '/ulasim/otobus-saatleri',
  '/ulasim/ucak-saatleri',
  '/etkinlikler',
  '/topluluk',
  '/eslesme',
  '/isletme-kayit',
];

for (const signal of llmsSignals) {
  if (!llms.includes(signal)) {
    console.error(`[seo-geo-gate] llms.txt missing signal: ${signal}`);
    process.exit(1);
  }
}

for (const signal of robotSignals) {
  if (!robots.includes(signal)) {
    console.error(`[seo-geo-gate] robots.txt missing signal: ${signal}`);
    process.exit(1);
  }
}

for (const signal of sitemapSignals) {
  if (!sitemap.includes(signal)) {
    console.error(`[seo-geo-gate] sitemap.xml missing critical URL signal: ${signal}`);
    process.exit(1);
  }
  if (!dynamicSitemap.includes(signal)) {
    console.error(`[seo-geo-gate] sitemap-dynamic.xml missing critical URL signal: ${signal}`);
    process.exit(1);
  }
}

console.log('[seo-geo-gate] ok: llms/sitemap/robots surfaces and AI crawler signals present');
