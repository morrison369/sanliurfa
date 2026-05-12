#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mapFile = path.join(root, 'src', 'data', 'image-map.ts');

if (!fs.existsSync(mapFile)) {
  console.error('content-image-relevance-gate: image-map.ts missing');
  process.exit(1);
}

const content = fs.readFileSync(mapFile, 'utf8');
const requiredTokens = ['historical', 'food', 'pickMappedImage', 'tag:', "hero:"];
const missing = requiredTokens.filter((t) => !content.includes(t));

if (missing.length > 0) {
  console.error(`content-image-relevance-gate: missing tokens -> ${missing.join(', ')}`);
  process.exit(1);
}

const failures = [];
const foodPoolMatch = content.match(/food:\s*\[([\s\S]*?)\n\s*\]/);
const foodPool = foodPoolMatch?.[1] || '';
for (const badToken of ["tag: 'city'", 'tag: "city"', "tag: 'history'", 'tag: "history"']) {
  if (foodPool.includes(badToken)) {
    failures.push(`IMAGE_MAP.pools.food contains ${badToken}; food fallback images must stay food-only`);
  }
}

for (const badPath of [
  '/images/blog/harran',
  '/images/blog/halfeti',
  '/images/blog/balikligol',
  '/images/blog/gobeklitepe',
  '/images/blog/urfa-kalesi',
]) {
  if (foodPool.includes(badPath)) {
    failures.push(`IMAGE_MAP.pools.food contains unrelated city/history image ${badPath}`);
  }
}

const homepageRecipesBlock =
  content.match(/recipes:\s*\{([\s\S]*?)\n\s*\},\n\s*blog:/)?.[1] || '';
const homepageRecipesPool =
  content.match(/recipes:\s*\[([\s\S]*?)\n\s*\],\n\s*blog:/)?.[1] || '';
for (const [label, block] of [
  ['IMAGE_MAP.homepage.recipes', homepageRecipesBlock],
  ['IMAGE_MAP.homepage.pools.recipes', homepageRecipesPool],
]) {
  for (const badFragment of [
    'placeholder-card',
    '/images/blog/harran',
    '/images/blog/halfeti',
    '/images/blog/balikligol',
    '/images/blog/gobeklitepe',
    '/images/places/gumruk-han',
  ]) {
    if (block.includes(badFragment)) {
      failures.push(`${label} contains non-food or placeholder image fragment ${badFragment}`);
    }
  }
}

for (const requiredRecipeAsset of [
  '/images/foods/homepage/urfa-kebabi-card.png',
  '/images/foods/homepage/sillik-tatlisi-card.png',
  '/images/foods/homepage/cig-kofte-card.png',
  '/images/foods/homepage/patlican-kebabi-card.png',
  '/images/foods/homepage/borani-card.png',
  '/images/foods/homepage/lebeni-card.png',
]) {
  if (!content.includes(requiredRecipeAsset)) {
    failures.push(`IMAGE_MAP.homepage.recipes missing curated local asset ${requiredRecipeAsset}`);
  }
}

const homepageBlogBlock =
  content.match(/blog:\s*\{([\s\S]*?)\n\s*\},\n\s*pools:/)?.[1] || '';
for (const [slug, expectedFragment] of [
  ['sanliurfa-en-iyi-kebapcilar', 'urfa-kebabi-card.png'],
  ['cig-kofte-nasil-yapilir-sanliurfa-tarifi', 'cig-kofte-card.png'],
  ['sanliurfa-gezilecek-10-tarihi-yer', 'tarihi-yerler-rehberi.jpg'],
]) {
  if (!homepageBlogBlock.includes(slug) || !homepageBlogBlock.includes(expectedFragment)) {
    failures.push(`IMAGE_MAP.homepage.blog missing relevant mapping for ${slug} -> ${expectedFragment}`);
  }
}

if (failures.length > 0) {
  console.error('content-image-relevance-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const titleTagRules = [
  { keyword: 'mekan', expected: ['food', 'city'] },
  { keyword: 'isletme', expected: ['food', 'city'] },
  { keyword: 'gezilecek', expected: ['history', 'city'] },
  { keyword: 'tarihi', expected: ['history'] },
];

const pages = [
  'src/pages/index.astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/gezilecek-yerler/index.astro',
  'src/pages/isletme/index.astro',
];

for (const rel of pages) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p, 'utf8').toLowerCase();
  const hitRule = titleTagRules.find((r) => raw.includes(r.keyword));
  if (!hitRule) continue;
  const hasTag = hitRule.expected.some((tag) => content.includes(`tag: '${tag}'`) || content.includes(`tag: "${tag}"`));
  if (!hasTag) {
    console.error(`content-image-relevance-gate: ${rel} expected tags missing (${hitRule.expected.join(',')})`);
    process.exit(1);
  }
}

const resolverExpectations = [
  ['src/components/PlaceCard.astro', 'resolvePlaceImage'],
  ['src/pages/mekanlar/index.astro', 'resolvePlaceImage'],
  ['src/pages/mekanlar/[kategori].astro', 'resolvePlaceImage'],
  ['src/pages/isletme/[slug].astro', 'resolvePlaceImage'],
  ['src/pages/gastronomi/index.astro', 'resolvePlaceImage'],
  ['src/pages/yemek-tarifleri/index.astro', 'resolveRecipeImage'],
  ['src/pages/yemek-tarifleri/[slug].astro', 'resolveRecipeImage'],
  ['src/pages/sanliurfada-ne-yenir.astro', 'resolveRecipeImage'],
  ['src/components/food/FeaturedFoods.astro', 'resolveRecipeImage'],
  ['src/components/home/RecipesSection.astro', 'resolveRecipeImage'],
  ['src/pages/ara.astro', 'resolveBlogImage'],
  ['src/pages/blog/index.astro', 'resolveBlogImage'],
  ['src/pages/blog/[slug].astro', 'resolveBlogImage'],
  ['src/components/blog/RelatedPosts.astro', 'resolveBlogImage'],
  ['src/components/home/BlogSection.astro', 'resolveBlogImage'],
  ['src/components/home/DailyPicks.astro', 'resolvePlaceImage'],
  ['src/components/home/DailyPicks.astro', 'resolveHistoricalImage'],
  ['src/components/home/DailyPicks.astro', 'resolveEventImage'],
  ['src/pages/gezilecek-yerler/index.astro', 'resolveHistoricalImage'],
  ['src/pages/gezilecek-yerler/[slug].astro', 'resolveHistoricalImage'],
  ['src/pages/tarihi-yerler/index.astro', 'resolveHistoricalImage'],
  ['src/pages/tarihi-yerler/[slug].astro', 'resolveHistoricalImage'],
  ['src/pages/etkinlikler/index.astro', 'resolveEventImage'],
  ['src/pages/etkinlikler/[slug].astro', 'resolveEventImage'],
  ['src/components/events/RelatedEvents.astro', 'resolveEventImage'],
  ['src/pages/ilceler/[ilce]/index.astro', 'resolvePlaceImage'],
  ['src/pages/ilceler/[ilce]/[kategori].astro', 'resolvePlaceImage'],
  ['src/pages/oneriler.astro', 'resolvePlaceImage'],
];

for (const [rel, expectedToken] of resolverExpectations) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`content-image-relevance-gate: required file missing -> ${rel}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.includes(expectedToken)) {
    console.error(`content-image-relevance-gate: ${rel} must use ${expectedToken}`);
    process.exit(1);
  }
}

const noInlineImageFallbackFiles = [
  'src/components/home/AgencyFeaturedPlacesSection.astro',
  'src/components/home/AgencyHistoricalSitesSection.astro',
  'src/components/home/AgencyRecipesSection.astro',
  'src/components/home/AgencyBlogSection.astro',
  'src/components/home/BlogSection.astro',
  'src/components/home/HistoricalSitesSection.astro',
  'src/components/home/RecipesSection.astro',
  'src/components/home/DailyPicks.astro',
  'src/pages/gastronomi/index.astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/yemek-tarifleri/index.astro',
];

for (const rel of noInlineImageFallbackFiles) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`content-image-relevance-gate: required file missing -> ${rel}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.includes('onerror=')) {
    console.error(`content-image-relevance-gate: ${rel} contains inline image onerror fallback; use Image.astro + resolver pipeline`);
    process.exit(1);
  }
}

const noRawContentImgFiles = [
  'src/components/public/PublicRelatedGrid.astro',
  'src/components/public/PublicRelatedList.astro',
  'src/pages/blog/index.astro',
  'src/pages/blog/[slug].astro',
];

for (const rel of noRawContentImgFiles) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`content-image-relevance-gate: required file missing -> ${rel}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.includes('<img ')) {
    console.error(`content-image-relevance-gate: ${rel} contains raw <img>; use Image.astro + resolver pipeline`);
    process.exit(1);
  }
}

const publicResolverFile = path.join(root, 'src', 'lib', 'public-image-resolvers.ts');
const publicResolverRaw = fs.readFileSync(publicResolverFile, 'utf8');
if ((publicResolverRaw.match(/allowExternalExplicit:\s*false/g) || []).length < 5) {
  console.error('content-image-relevance-gate: public-image-resolvers must disable external explicit images');
  process.exit(1);
}

console.log('content-image-relevance-gate: PASS');
