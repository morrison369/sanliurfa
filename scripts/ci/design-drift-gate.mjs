#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const criticalFiles = [
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/pages/index.astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/gezilecek-yerler/index.astro',
  'src/pages/isletme/index.astro',
];

const forbidden = [
  'style="display:inline-flex;align-items:center;gap:0.25rem',
  'onmouseover=',
  'onmouseout=',
  "onmouseover='",
  "onmouseout='",
];

for (const rel of criticalFiles) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p, 'utf8');
  for (const token of forbidden) {
    if (raw.includes(token)) {
      console.error(`design-drift-gate: forbidden token in ${rel} -> ${token}`);
      process.exit(1);
    }
  }
}

console.log('design-drift-gate: PASS');
