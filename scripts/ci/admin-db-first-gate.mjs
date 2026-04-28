#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

const requiredFiles = [
  'src/lib/site-content.ts',
  'src/pages/api/admin/site/settings.ts',
  'src/components/admin/SiteContentManager.tsx',
  'src/pages/admin/site-content.astro',
  'src/layouts/Layout.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/pages/index.astro',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`${file}: missing`);
  }
}

function requireToken(file, token) {
  const content = readFileSync(resolve(root, file), 'utf8');
  if (!content.includes(token)) {
    errors.push(`${file}: missing "${token}"`);
  }
}

requireToken('src/layouts/Layout.astro', 'getSiteSetting');
requireToken('src/components/Header.astro', 'getSiteSetting');
requireToken('src/components/Footer.astro', 'getSiteSetting');
requireToken('src/pages/index.astro', 'getSiteSettingRequired');
requireToken('src/pages/index.astro', "getSiteSettingRequired('homepage.seo'");
requireToken('src/pages/index.astro', "getSiteSettingRequired('homepage.schema'");

if (errors.length) {
  console.error('[admin-db-first-gate] FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('[admin-db-first-gate] ok');
