#!/usr/bin/env node

const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--') || !raw.includes('=')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('='));
}

const mode = args.get('mode') || process.env.HOMEPAGE_IMAGE_HTML_MODE || 'local';
const defaultBaseUrl = mode === 'prod' ? 'https://sanliurfa.com' : 'http://127.0.0.1:4321';
const baseUrl = new URL(args.get('base-url') || process.env.HOMEPAGE_IMAGE_HTML_BASE_URL || defaultBaseUrl);
const timeoutMs = Math.max(1000, Number(args.get('timeout-ms') || process.env.HOMEPAGE_IMAGE_HTML_TIMEOUT_MS || '45000'));

function fail(message, details = []) {
  console.error(`[homepage-image-html-gate] ${message}`);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}

function extractAttr(tag, attr) {
  const match = tag.match(new RegExp(`\\s${attr}=(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match?.[1] || match?.[2] || '';
}

async function fetchHome() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(baseUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Sanliurfa.com homepage image HTML gate (+https://sanliurfa.com)',
      },
    });
    if (response.status < 200 || response.status >= 300) {
      fail(`homepage okunamadı: ${response.status} ${baseUrl.href}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const html = await fetchHome();
const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => {
  const tag = match[0];
  return {
    src: extractAttr(tag, 'src'),
    alt: extractAttr(tag, 'alt'),
    className: extractAttr(tag, 'class'),
  };
});

const contentImages = images.filter((image) =>
  /place-img|hist-img|editorial-img/.test(image.className),
);
const minContentImages = mode === 'prod' ? 12 : 7;
if (contentImages.length < minContentImages) {
  fail('homepage içerik görsel sayısı beklenenden düşük', [`count=${contentImages.length}`]);
}

const duplicateContent = [...new Set(
  contentImages
    .map((image) => image.src)
    .filter((src, index, list) => src && list.indexOf(src) !== index),
)];

const genericAlt = contentImages.filter((image) =>
  ['şanlıurfa', 'sanliurfa', ''].includes(image.alt.trim().toLocaleLowerCase('tr-TR')),
);

const recipeImages = contentImages.filter((image) =>
  image.className.includes('editorial-img') && /yemek tarifi/i.test(image.alt),
);
const badRecipeImages = recipeImages.filter((image) =>
  !image.src.startsWith('/images/foods/homepage/'),
);

const failures = [];
if (duplicateContent.length > 0) {
  failures.push(`duplicate content image src: ${duplicateContent.join(', ')}`);
}
for (const image of genericAlt) {
  failures.push(`generic image alt: src=${image.src}, alt=${image.alt}`);
}
for (const image of badRecipeImages) {
  failures.push(`recipe card uses non-curated homepage food asset: ${image.alt} -> ${image.src}`);
}

if (failures.length > 0) {
  fail('homepage görsel HTML sözleşmesi başarısız', failures);
}

console.log(`homepage-image-html-gate: PASS (${mode}, contentImages=${contentImages.length}, recipes=${recipeImages.length})`);
