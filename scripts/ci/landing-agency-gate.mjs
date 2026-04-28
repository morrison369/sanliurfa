#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

function requireToken(rel, token) {
  const full = resolve(root, rel);
  if (!existsSync(full)) {
    errors.push(`${rel}: missing`);
    return;
  }
  const content = readFileSync(full, 'utf8');
  if (!content.includes(token)) {
    errors.push(`${rel}: missing "${token}"`);
  }
}

requireToken('src/pages/index.astro', "getSiteSettingRequired('homepage.hero'");
requireToken('src/pages/index.astro', "getSiteSetting('homepage.sectionStyles'");
requireToken('src/pages/index.astro', "getSiteSetting('homepage.liveStatusCards'");
requireToken('src/pages/index.astro', '/saglik/nobetci-eczaneler');
requireToken('src/pages/index.astro', '/ulasim/otobus-saatleri');
requireToken('src/pages/index.astro', '/ulasim/ucak-saatleri');

if (errors.length) {
  console.error('[landing-agency-gate] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[landing-agency-gate] ok');
