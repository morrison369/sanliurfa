#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'docs/ROUTE_OWNERSHIP.md',
  'src/pages/index.astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/gezilecek-yerler/index.astro',
  'src/pages/isletme/index.astro',
  'src/pages/isletme/[slug].astro',
  'src/pages/blog/[slug].astro',
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`route-ownership-gate: missing ${rel}`);
    process.exit(1);
  }
}

console.log('route-ownership-gate: PASS');
