#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'src/pages/index.astro',
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/ulasim/otobus-saatleri.astro',
  'src/pages/ulasim/ucak-saatleri.astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/yemek-tarifleri/index.astro',
  'src/pages/etkinlikler/index.astro',
  'src/pages/ilceler/index.astro',
  'src/pages/topluluk.astro',
  'src/pages/eslesme.astro',
  'src/pages/isletme-kayit.astro',
  'src/lib/city-content-agents.ts',
  'src/pages/llms.txt.ts',
  'docs/SEHIR_ICERIK_AJANLARI.md',
  'public/images/image-manifest.json',
  'public/images/placeholder-event.jpg',
  'public/images/foods/default.jpg',
  'public/images/hero/hero-home.webp',
  'public/images/hero/hero-food.webp',
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('[city-content-acceptance] missing required MVP surface files:');
  for (const file of missing) console.error(` - ${file}`);
  process.exit(1);
}

const agents = readFileSync('src/lib/city-content-agents.ts', 'utf8');
const docs = readFileSync('docs/SEHIR_ICERIK_AJANLARI.md', 'utf8');
const llms = readFileSync('src/pages/llms.txt.ts', 'utf8');
const imageManifest = JSON.parse(readFileSync('public/images/image-manifest.json', 'utf8'));

const publicPageSignals = [
  ['src/pages/saglik/nobetci-eczaneler.astro', 'Şanlıurfa Nöbetçi Eczaneler'],
  ['src/pages/ulasim/otobus-saatleri.astro', 'Şanlıurfa Otobüs Saatleri'],
  ['src/pages/ulasim/ucak-saatleri.astro', 'Şanlıurfa Uçak Saatleri'],
  ['src/pages/etkinlikler/index.astro', 'Şanlıurfa Etkinlikleri'],
  ['src/pages/yemek-tarifleri/index.astro', 'Şanlıurfa Özel Yemek Tarifleri'],
  ['src/pages/topluluk.astro', 'Şanlıurfa Topluluk Özellikleri'],
  ['src/pages/eslesme.astro', 'Şanlıurfa Eşleşme'],
  ['src/pages/isletme-kayit.astro', 'Şanlıurfa İşletme Kaydı'],
  ['src/pages/gezilecek-yerler/[slug].astro', 'Şanlıurfa Gezilecek Yerler'],
];

const publicSeoSignals = [
  ['src/pages/saglik/nobetci-eczaneler.astro', ['Hızlı Cevap', 'FAQPage', '/saglik/nobetci-eczaneler']],
  ['src/pages/ulasim/otobus-saatleri.astro', ['Hızlı Cevap', 'FAQPage', '/saglik/nobetci-eczaneler']],
  ['src/pages/ulasim/ucak-saatleri.astro', ['Hızlı Cevap', 'FAQPage', '/ulasim/otobus-saatleri']],
  ['src/pages/etkinlikler/index.astro', ['Hızlı Cevap', 'FAQPage', 'ItemList']],
  ['src/pages/mekanlar/index.astro', ['Hızlı Cevap', 'FAQPage', 'BreadcrumbList', '/mekanlar']],
  ['src/pages/ilceler/index.astro', ['Hızlı Cevap', 'FAQPage', 'ItemList', '/ilceler/']],
  ['src/pages/yemek-tarifleri/index.astro', ['Hızlı Cevap', 'FAQPage', 'ItemList', '/mekanlar/yoresel-yemekler']],
  ['src/pages/topluluk.astro', ['Hızlı Cevap', 'FAQPage', '/eslesme']],
  ['src/pages/eslesme.astro', ['Hızlı Cevap', 'FAQPage', 'WebPage', '/topluluk']],
  ['src/pages/isletme-kayit.astro', ['Hızlı Cevap', 'FAQPage', 'WebPage', '/mekanlar']],
];

const publicImageSignals = [
  [
    'src/components/home/CityGuideLanding.astro',
    [
      '/images/home/collage/balikligol.webp',
      '/images/home/collage/gobeklitepe.webp',
      '/images/home/collage/harran.webp',
      '/images/home/collage/halfeti.webp',
    ],
  ],
  ['src/pages/etkinlikler/index.astro', ['resolveEventImage', 'imageAlt: event.title', 'PublicCollectionList']],
  ['src/pages/yemek-tarifleri/index.astro', ['resolveRecipeImage', 'alt={recipe.name}', '<Image']],
  ['src/pages/gezilecek-yerler/[slug].astro', ['resolveHistoricalImage', 'imageAlt={site.name}', 'Şanlıurfa Gezilecek Yerler']],
];

const agentSignals = [
  'city-service-agent',
  'culture-event-agent',
  'place-enrichment-agent',
  'recipe-content-agent',
  'image-import-agent',
  'seo-geo-agent',
  'autoPublish: false',
  'Pexels',
  'Unsplash',
  'isCityContentAgentKey',
  'CityContentAgentError',
  '/api/admin/site/media/search',
  '/api/admin/site/media/import',
];

const docsSignals = [
  'admin onayı',
  'otomatik yayın yapmaz',
  'Şanlıurfa',
  'Pexels',
  'Unsplash',
  'Bu kaynaktan üret',
  'application/problem+json',
];
const llmsSignals = [
  'Şanlıurfa yemek tarifleri',
  'Şanlıurfa nöbetçi eczaneler',
  'Şanlıurfa otobüs saatleri',
  'Şanlıurfa uçak saatleri',
  'Şanlıurfa etkinlikleri',
  'Şanlıurfa topluluk',
  'Odak anahtar kelime: Şanlıurfa',
];

for (const signal of agentSignals) {
  if (!agents.includes(signal)) {
    console.error(`[city-content-acceptance] city agent missing signal: ${signal}`);
    process.exit(1);
  }
}

for (const [file, signal] of publicPageSignals) {
  const content = readFileSync(file, 'utf8');
  if (!content.includes(signal)) {
    console.error(`[city-content-acceptance] public page ${file} missing focus signal: ${signal}`);
    process.exit(1);
  }
}

for (const [file, signals] of publicSeoSignals) {
  const content = readFileSync(file, 'utf8');
  for (const signal of signals) {
    if (!content.includes(signal)) {
      console.error(`[city-content-acceptance] public page ${file} missing SEO/AEO signal: ${signal}`);
      process.exit(1);
    }
  }
}

for (const [file, signals] of publicImageSignals) {
  const content = readFileSync(file, 'utf8');
  for (const signal of signals) {
    if (!content.includes(signal)) {
      console.error(`[city-content-acceptance] public page ${file} missing image signal: ${signal}`);
      process.exit(1);
    }
  }
}

const manifestBuckets = new Set(imageManifest.map((item) => item.bucket).filter(Boolean));
for (const bucket of ['blog', 'places', 'etkinlikler']) {
  if (!manifestBuckets.has(bucket)) {
    console.error(`[city-content-acceptance] image manifest missing required bucket: ${bucket}`);
    process.exit(1);
  }
}

for (const signal of docsSignals) {
  if (!docs.includes(signal)) {
    console.error(`[city-content-acceptance] docs missing signal: ${signal}`);
    process.exit(1);
  }
}

for (const signal of llmsSignals) {
  if (!llms.includes(signal)) {
    console.error(`[city-content-acceptance] llms missing signal: ${signal}`);
    process.exit(1);
  }
}

if (!Array.isArray(imageManifest) || imageManifest.length < 5) {
  console.error('[city-content-acceptance] image manifest must include at least 5 managed image records');
  process.exit(1);
}

console.log('[city-content-acceptance] ok: public pages, city agents, docs, llms and image manifest locked');
