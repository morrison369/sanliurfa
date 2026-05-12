import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const canonicalDocs = [
  'AGENTS.md',
  'docs/SOURCE_OF_TRUTH.md',
  'docs/README.md',
  'docs/MVP_PUBLIC_ACCEPTANCE.md',
  'docs/ASTRO_SSR_FRONTEND_STACK.md',
  'docs/CITY_TAXONOMY_AND_SOCIAL_SURFACE.md',
  'docs/UI_CONTRACTS.md',
  'docs/SEHIR_ICERIK_AJANLARI.md',
];

const forbiddenTerms = [
  { pattern: /\bCasineon\b/i, label: 'baska proje adi: Casineon' },
  { pattern: /\bBetvoy/i, label: 'baska proje adi: Betvoy' },
  { pattern: /\bcasino\b/i, label: 'casino tema dili' },
  { pattern: /\bbahis\b/i, label: 'bahis proje dili' },
  { pattern: /ürün\/mağaza|urun\/magaza|e-ticaret/i, label: 'ticaret proje dili' },
  { pattern: /sf-btn-secondary-dark|secondary-dark/i, label: 'eski dark CTA sozlesmesi' },
  { pattern: /blog teması|directory tasarımı/i, label: 'yasakli hazir tema dili' },
  { pattern: /iPhone|Samsung|Laptop|Kulaklık/i, label: 'e-ticaret demo terimi' },
];

for (const doc of canonicalDocs) {
  const fullPath = path.join(root, doc);
  if (!fs.existsSync(fullPath)) {
    failures.push(`kanonik dokuman eksik: ${doc}`);
    continue;
  }

  const source = fs.readFileSync(fullPath, 'utf8');
  for (const item of forbiddenTerms) {
    if (item.pattern.test(source)) {
      failures.push(`${doc} yasakli/yanlis terim iceriyor: ${item.label}`);
    }
  }
}

const sourceOfTruth = fs.readFileSync(path.join(root, 'docs/SOURCE_OF_TRUTH.md'), 'utf8');
for (const required of [
  'docs/MVP_PUBLIC_ACCEPTANCE.md',
  'docs/ASTRO_SSR_FRONTEND_STACK.md',
  'docs/CITY_TAXONOMY_AND_SOCIAL_SURFACE.md',
  'docs/UI_CONTRACTS.md',
]) {
  if (!sourceOfTruth.includes(required)) {
    failures.push(`SOURCE_OF_TRUTH kanonik dosyayi listelemiyor: ${required}`);
  }
}

if (failures.length > 0) {
  console.error('docs-terminology-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('docs-terminology-gate: PASS');
