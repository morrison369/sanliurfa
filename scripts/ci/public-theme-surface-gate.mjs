import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const keyPublicFiles = [
  'src/pages/index.astro',
  'src/components/home/CityGuideLanding.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/pages/arama/index.astro',
  'src/components/SearchResults.tsx',
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/harita.astro',
  'src/pages/eslesme.astro',
  'src/pages/topluluk.astro',
];

const hardForbiddenByFile = new Map([
  ['src/pages/saglik/nobetci-eczaneler.astro', ['background:#0D0A08', '<div class="ne-icon">💊</div>']],
  ['src/pages/harita.astro', ['display:none;position:fixed', 'ht-list-placeholder', '<div class="ht-list-placeholder">']],
  ['src/components/SearchResults.tsx', ['text-[#EDE0C6]', 'bg-[var(--bg-card)] text-[#EDE0C6]']],
  ['src/pages/ara.astro', ['<Layout', 'canonical: \'/ara\'', 'ar-card-placeholder']],
]);

for (const file of keyPublicFiles) {
  assert(fs.existsSync(path.join(root, file)), `public theme dosyasi eksik: ${file}`);
}

for (const [file, tokens] of hardForbiddenByFile) {
  const source = read(file);
  for (const token of tokens) {
    assert(!source.includes(token), `${file} eski tema/placeholder kalintisi iceriyor: ${token}`);
  }
}

const seoSource = read('src/components/SEO.astro');
assert(seoSource.includes('resolveSeoOgImage'), 'SEO.astro route-aware OG image resolver kullanmiyor');

const haritaSource = read('src/pages/harita.astro');
assert(haritaSource.includes('ht-modal hidden'), 'Harita mobil liste modalı hidden class ile baslamiyor');
assert(haritaSource.includes("src={place.thumbnail || mapFallbackImage}"), 'Harita liste thumbnail fallback gorseli kullanmiyor');

const pharmacySource = read('src/pages/saglik/nobetci-eczaneler.astro');
assert(pharmacySource.includes('linear-gradient(135deg,#fff8ec'), 'Nobetci eczane hero sicak light tema kullanmiyor');
assert(pharmacySource.includes('<div class="ne-icon">EC</div>'), 'Nobetci eczane kartlari emoji placeholder yerine metin rozet kullanmiyor');

const araSource = read('src/pages/ara.astro');
assert(araSource.includes('Astro.redirect'), '/ara kanonik redirect degil');

if (failures.length > 0) {
  console.error('public-theme-surface-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('public-theme-surface-gate: PASS');
