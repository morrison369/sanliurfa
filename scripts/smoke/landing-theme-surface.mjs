import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const themeEntry = path.join(repoRoot, 'src', 'components', 'home', 'HomepageThemeStyles.astro');
const heroStyles = path.join(repoRoot, 'src', 'components', 'home', 'theme', 'HomepageHeroStyles.astro');
const coreStyles = path.join(repoRoot, 'src', 'components', 'home', 'theme', 'HomepageCoreStyles.astro');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of [themeEntry, heroStyles, coreStyles]) {
  assert(fs.existsSync(file), `Eksik landing tema dosyası: ${path.relative(repoRoot, file)}`);
}

const entrySource = fs.readFileSync(themeEntry, 'utf8');
assert(entrySource.includes("import HomepageHeroStyles from './theme/HomepageHeroStyles.astro';"), 'HomepageThemeStyles hero stil modülünü import etmiyor.');
assert(entrySource.includes("import HomepageCoreStyles from './theme/HomepageCoreStyles.astro';"), 'HomepageThemeStyles core stil modülünü import etmiyor.');
assert(!entrySource.includes('.home-hero {'), 'HomepageThemeStyles içinde doğrudan hero CSS kaldı; stil modüllerine taşınmalı.');
assert(!entrySource.includes('.sf-section {'), 'HomepageThemeStyles içinde doğrudan section CSS kaldı; stil modüllerine taşınmalı.');

const heroSource = fs.readFileSync(heroStyles, 'utf8');
const coreSource = fs.readFileSync(coreStyles, 'utf8');
assert(heroSource.includes('.hero-stage'), 'Hero stil modülü ana hero grid kurallarını içermiyor.');
assert(coreSource.includes('.sf-section'), 'Core stil modülü section kurallarını içermiyor.');

console.log('landing-theme-surface: ok');
