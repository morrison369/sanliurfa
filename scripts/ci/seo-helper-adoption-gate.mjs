#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pages = [
  'src/pages/mekanlar/index.astro',
  'src/pages/gezilecek-yerler/index.astro',
  'src/pages/isletme/index.astro',
  'src/pages/isletme/[slug].astro',
  'src/pages/gezilecek-yerler/[slug].astro',
  'src/pages/blog/[slug].astro',
];

for (const rel of pages) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`seo-helper-adoption-gate: missing ${rel}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(full, 'utf8');
  if (!raw.includes("from '../../lib/seo/pageSeo'") || !raw.includes('buildPageSeo(')) {
    console.error(`seo-helper-adoption-gate: ${rel} missing buildPageSeo adoption`);
    process.exit(1);
  }
}

console.log('seo-helper-adoption-gate: PASS');
