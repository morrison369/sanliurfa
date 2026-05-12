#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

function read(rel) {
  const full = resolve(root, rel);
  if (!existsSync(full)) {
    errors.push(`${rel}: missing`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

function requireToken(rel, token) {
  const content = read(rel);
  if (content && !content.includes(token)) {
    errors.push(`${rel}: missing "${token}"`);
  }
}

function forbidPattern(rel, pattern, label) {
  const content = read(rel);
  if (content && pattern.test(content)) {
    errors.push(`${rel}: forbidden ${label}`);
  }
}

function requirePattern(rel, pattern, label) {
  const content = read(rel);
  if (content && !pattern.test(content)) {
    errors.push(`${rel}: missing ${label}`);
  }
}

const index = read('src/pages/index.astro');
const heroSection = read('src/components/home/AgencyHeroSection.astro');
const astroConfig = read('astro.config.mjs');
const globalCss = read('src/styles/global.css');

requireToken('src/pages/index.astro', "getSiteSettingRequired<Record<string, any>>('homepage.seo'");
requireToken('src/pages/index.astro', "getSiteSettingRequired<Record<string, any>>('homepage.schema'");
requireToken('src/pages/index.astro', "landing-agency-gate signal: getSiteSettingRequired('homepage.hero'");
requireToken('src/pages/index.astro', "landing-agency-gate signal: getSiteSetting('homepage.sectionStyles'");
requireToken('src/pages/index.astro', "landing-agency-gate signal: getSiteSetting('homepage.liveStatusCards'");
requireToken('src/pages/index.astro', '/saglik/nobetci-eczaneler');
requireToken('src/pages/index.astro', '/ulasim/otobus-saatleri');
requireToken('src/pages/index.astro', '/ulasim/ucak-saatleri');

if (!astroConfig.includes("output: 'server'")) errors.push('astro.config.mjs: SSR output server missing');
if (!astroConfig.includes("mode: 'standalone'")) errors.push('astro.config.mjs: @astrojs/node standalone missing');
if (!astroConfig.includes("import tailwindcss from '@tailwindcss/vite'")) {
  errors.push('astro.config.mjs: @tailwindcss/vite import missing');
}
if (!/vite:\s*{[\s\S]*plugins:\s*\[\s*tailwindcss\(\)\s*\]/m.test(astroConfig)) {
  errors.push('astro.config.mjs: Tailwind Vite plugin not wired');
}
if (!globalCss.includes('@import "tailwindcss"')) errors.push('src/styles/global.css: Tailwind v4 import missing');
if (!globalCss.includes('@plugin "@tailwindcss/typography"')) {
  errors.push('src/styles/global.css: typography plugin missing');
}
if (!globalCss.includes('@plugin "@tailwindcss/forms"')) {
  errors.push('src/styles/global.css: forms plugin missing');
}

forbidPattern(
  'src/pages/index.astro',
  /taj\s*mahal|tajmahal|images\.pexels\.com|images\.unsplash\.com|source\.unsplash\.com/i,
  'unapproved remote or irrelevant hero image',
);
forbidPattern(
  'src/pages/index.astro',
  /0\+\s*kay[ıi]t|0\s*etkinlik|0\s*aktif\s*mekan/i,
  'zero-trust visible copy',
);
forbidPattern(
  'src/pages/index.astro',
  /bg-\[#170f0a\].*text-\[#fff7ec\]/s,
  'old dark-heavy hero signature',
);

const allowedLocalImages = [
  '/images/places/balikligol-api/main.jpg',
  '/images/places/balikligol-api/main.webp',
  '/images/places/gobeklitepe-api/main.jpg',
  '/images/places/gobeklitepe-api/main.webp',
  '/images/tarihi-yerler/harran-kumbet-evleri-api/main.jpg',
  '/images/tarihi-yerler/harran-kumbet-evleri-api/main.webp',
  '/images/places/balikligol/main-hero.webp',
  '/images/places/gobeklitepe/hero-hero.webp',
  '/images/tarihi-yerler/harran-kumbet-evleri.jpg',
  '/images/blog/halfeti.jpg',
  '/images/blog/urfa-kalesi.jpg',
  '/images/blog/gobeklitepe.jpg',
  '/images/blog/balikligol.jpg',
];

if (!allowedLocalImages.some((image) => index.includes(image))) {
  errors.push('src/pages/index.astro: no whitelisted Şanlıurfa hero/route image found');
}

requirePattern('src/pages/index.astro', /Urfa’da nereye gidilir\?/, 'clear local hero H1');
requirePattern('src/pages/index.astro', /Balıklıgöl|Göbeklitepe|Harran/, 'Şanlıurfa route naming');
requirePattern('src/pages/index.astro', /#fbf1df|#f4e6d0|#1f5f55|#b8652b/, 'light Şanlıurfa palette tokens');
if (!/(Mekanları Keşfet)/.test(index) && !/(Mekanları Keşfet)/.test(heroSection)) {
  errors.push('landing hero: missing primary above-fold CTA');
}
if (!/(Tarihi Rotalar)/.test(index) && !/(Tarihi Rotalar)/.test(heroSection)) {
  errors.push('landing hero: missing secondary route CTA');
}

if (errors.length) {
  console.error('[landing-agency-gate] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[landing-agency-gate] ok: Astro SSR, Tailwind Vite plugin and landing quality contract passed');
