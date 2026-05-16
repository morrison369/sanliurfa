#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PUBLIC_ROUTE_SMOKE_ROUTES } from '../smoke/public-route-smoke-routes.mjs';

const root = process.cwd();
const showNotes = process.env.PUBLIC_ROUTE_CACHE_CONTRACT_NOTES !== '0';

const routeToFile = new Map([
  ['/', 'src/pages/index.astro'],
  ['/mekanlar', 'src/pages/mekanlar/index.astro'],
  ['/mekanlar/yeme-icme', 'src/pages/mekanlar/[kategori].astro'],
  ['/isletme', 'src/pages/isletme/index.astro'],
  ['/isletme-kayit', 'src/pages/isletme-kayit.astro'],
  ['/isletme/balikligol', 'src/pages/isletme/[slug].astro'],
  ['/blog', 'src/pages/blog/index.astro'],
  ['/blog/sanliurfa-en-iyi-kebapcilar', 'src/pages/blog/[slug].astro'],
  ['/gezilecek-yerler', 'src/pages/gezilecek-yerler/index.astro'],
  ['/gezilecek-yerler/gobeklitepe', 'src/pages/gezilecek-yerler/[slug].astro'],
  ['/tarihi-yerler', 'src/pages/tarihi-yerler/index.astro'],
  ['/tarihi-yerler/gobeklitepe', 'src/pages/tarihi-yerler/[slug].astro'],
  ['/saglik', 'src/pages/saglik/index.astro'],
  ['/saglik/nobetci-eczaneler', 'src/pages/saglik/nobetci-eczaneler.astro'],
  ['/saglik/eczaneler', 'src/pages/saglik/[kategori].astro'],
  ['/ulasim', 'src/pages/ulasim/index.astro'],
  ['/ulasim/otogar', 'src/pages/ulasim/[kategori].astro'],
  ['/ulasim/otobus-hatlari', 'src/pages/ulasim/otobus-hatlari.astro'],
  ['/ulasim/otobus-saatleri', 'src/pages/ulasim/otobus-saatleri.astro'],
  ['/ulasim/ucak-saatleri', 'src/pages/ulasim/ucak-saatleri.astro'],
  ['/yeme-icme', 'src/pages/yeme-icme/index.astro'],
  ['/yeme-icme/kahvalti', 'src/pages/yeme-icme/[kategori].astro'],
  ['/gastronomi', 'src/pages/gastronomi/index.astro'],
  ['/yemek-tarifleri', 'src/pages/yemek-tarifleri/index.astro'],
  ['/yemek-tarifleri/urfa-kebabi', 'src/pages/yemek-tarifleri/[slug].astro'],
  ['/sanliurfada-ne-yenir', 'src/pages/sanliurfada-ne-yenir.astro'],
  ['/bugun-sanliurfada-ne-yapilir', 'src/pages/bugun-sanliurfada-ne-yapilir.astro'],
  ['/sanliurfa-gezi-rehberi', 'src/pages/sanliurfa-gezi-rehberi.astro'],
  ['/gobeklitepe-gezi-rehberi', 'src/pages/gobeklitepe-gezi-rehberi.astro'],
  ['/balikligol-gezi-rehberi', 'src/pages/balikligol-gezi-rehberi.astro'],
  ['/ucretsiz-gezilecek-yerler', 'src/pages/ucretsiz-gezilecek-yerler.astro'],
  ['/en-iyi-kebapcilar', 'src/pages/en-iyi-kebapcilar.astro'],
  ['/en-iyi-cigerciler', 'src/pages/en-iyi-cigerciler.astro'],
  ['/en-iyi-oteller', 'src/pages/en-iyi-oteller.astro'],
  ['/en-iyi-gezilecek-yerler', 'src/pages/en-iyi-gezilecek-yerler.astro'],
  ['/en-iyi-kahvalti-mekanlari', 'src/pages/en-iyi-kahvalti-mekanlari.astro'],
  ['/sanliurfa-kahvalti-mekanlari', 'src/pages/sanliurfa-kahvalti-mekanlari.astro'],
  ['/sanliurfa-gece-acik-mekanlar', 'src/pages/sanliurfa-gece-acik-mekanlar.astro'],
  ['/sanliurfa-sira-gecesi-mekanlari', 'src/pages/sanliurfa-sira-gecesi-mekanlari.astro'],
  ['/etkinlikler', 'src/pages/etkinlikler/index.astro'],
  ['/etkinlikler/bugun', 'src/pages/etkinlikler/[slug].astro'],
  ['/konaklama', 'src/pages/konaklama/index.astro'],
  ['/konaklama/oteller', 'src/pages/konaklama/[kategori].astro'],
  ['/alisveris', 'src/pages/alisveris/index.astro'],
  ['/alisveris/yoresel-urunler', 'src/pages/alisveris/[kategori].astro'],
  ['/egitim', 'src/pages/egitim/index.astro'],
  ['/egitim/universiteler', 'src/pages/egitim/[kategori].astro'],
  ['/hizmetler', 'src/pages/hizmetler/index.astro'],
  ['/hizmetler/cilingir', 'src/pages/hizmetler/[kategori].astro'],
  ['/emlak', 'src/pages/emlak/index.astro'],
  ['/emlak/kiralik-daire', 'src/pages/emlak/[kategori].astro'],
  ['/ilceler', 'src/pages/ilceler/index.astro'],
  ['/ilceler/haliliye', 'src/pages/ilceler/[ilce]/index.astro'],
  ['/ilceler/haliliye/yeme-icme', 'src/pages/ilceler/[ilce]/[kategori].astro'],
  ['/mahalleler', 'src/pages/mahalleler/index.astro'],
  ['/mahalleler/haliliye', 'src/pages/mahalleler/[ilce]/index.astro'],
  ['/harita', 'src/pages/harita.astro'],
  ['/arama', 'src/pages/arama/index.astro'],
  ['/topluluk/fotolar', 'src/pages/topluluk/fotolar.astro'],
  ['/hakkimizda', 'src/pages/hakkimizda.astro'],
  ['/hakkinda', 'src/pages/hakkinda.astro'],
  ['/iletisim', 'src/pages/iletisim.astro'],
]);

const authenticatedDataFiles = new Map([
  ['src/pages/isletme/panel.astro', 'requires Astro.locals.user and redirects guests to /giris'],
  ['src/pages/yorum/[slug].astro', 'requires getCurrentUser() and redirects guests to /giris'],
]);

const contractOnlyPublicFiles = [
  'src/pages/kategori/[slug].astro',
  'src/pages/mahalleler/[ilce]/[mahalle].astro',
  'src/pages/[...seopage].astro',
];

const requiredPublicFiles = [
  ...new Set([
    ...PUBLIC_ROUTE_SMOKE_ROUTES.map((route) => normalizeRoute(route.path || route)),
    '/isletme',
  ].map((route) => routeToFile.get(route)).filter(Boolean).concat(contractOnlyPublicFiles)),
];

const directDataPatterns = [
  /\bquery\s*\(/,
  /\bqueryOne\s*\(/,
  /\bgetPlaces\s*\(/,
  /\bgetPlaceBySlug\s*\(/,
];

const failures = [];
const warnings = [];

function normalizeRoute(route) {
  return String(route).split('?')[0].replace(/\/$/, '') || '/';
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function readSource(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function hasDirectDataCall(source) {
  return directDataPatterns.some((pattern) => pattern.test(source));
}

function hasAuthenticatedRedirect(source) {
  return /Astro\.redirect\(['"`]\/giris/.test(source) || /Astro\.redirect\(`\/giris/.test(source);
}

function lineNumberForPattern(source, patterns) {
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (patterns.some((pattern) => pattern.test(lines[index]))) return index + 1;
  }
  return 1;
}

function listAstroFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['api', 'admin', 'profil', 'vendor'].includes(entry.name)) continue;
      files.push(...listAstroFiles(abs));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.astro')) {
      files.push(normalizePath(path.relative(root, abs)));
    }
  }
  return files;
}

for (const route of PUBLIC_ROUTE_SMOKE_ROUTES) {
  const normalized = normalizeRoute(route.path || route);
  if (!routeToFile.has(normalized)) {
    failures.push(`route contract missing for smoke route: ${normalized}`);
  }
}

for (const rel of requiredPublicFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`missing public route file: ${rel}`);
    continue;
  }

  const source = readSource(rel);
  const hasDataCall = hasDirectDataCall(source);
  const hasSharedRouteCache = source.includes('getCachedPublicRouteData');
  const usesHomepageLoader = source.includes('loadHomepageCoreData');

  if (rel === 'src/pages/index.astro') {
    if (hasDataCall) {
      failures.push(`${rel}:${lineNumberForPattern(source, directDataPatterns)} direct DB call is not allowed on homepage; use src/lib/home-data.ts`);
    }
    if (!usesHomepageLoader) {
      failures.push(`${rel}: homepage must use loadHomepageCoreData()`);
    }
    continue;
  }

  if (hasDataCall && !hasSharedRouteCache) {
    failures.push(`${rel}:${lineNumberForPattern(source, directDataPatterns)} public SSR data call must use getCachedPublicRouteData()`);
  }
}

const publicAstroFiles = listAstroFiles(path.join(root, 'src/pages'));
const registeredDataFiles = new Set(requiredPublicFiles);

for (const rel of publicAstroFiles) {
  const source = readSource(rel);
  if (!hasDirectDataCall(source)) continue;

  const isRegisteredPublic = registeredDataFiles.has(rel);
  const isAuthenticatedDataFile = authenticatedDataFiles.has(rel);
  const hasSharedRouteCache = source.includes('getCachedPublicRouteData');
  const usesHomepageLoader = source.includes('loadHomepageCoreData');

  if (isAuthenticatedDataFile) {
    if (!hasAuthenticatedRedirect(source)) {
      failures.push(`${rel}: authenticated data exception must redirect unauthenticated users to /giris`);
    }
    warnings.push(`${rel}: auth-only data exception (${authenticatedDataFiles.get(rel)})`);
    continue;
  }

  if (!isRegisteredPublic && !hasSharedRouteCache && !usesHomepageLoader) {
    failures.push(`${rel}:${lineNumberForPattern(source, directDataPatterns)} unregistered public SSR data call must use getCachedPublicRouteData() or be added to authenticatedDataFiles`);
    continue;
  }

  if (!isRegisteredPublic && hasSharedRouteCache) {
    warnings.push(`${rel}: cached public data route is not represented by the smoke route contract`);
  }
}

if (failures.length > 0) {
  console.error('public-route-cache-contract-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (showNotes) {
  for (const warning of warnings) console.log(`public-route-cache-contract-gate: note: ${warning}`);
}
console.log(`public-route-cache-contract-gate: PASS (${requiredPublicFiles.length} route files, ${publicAstroFiles.length} public astro files scanned)`);
