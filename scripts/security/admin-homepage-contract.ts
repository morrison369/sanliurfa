import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

const homepagePath = join(root, 'src', 'pages', 'index.astro');
const siteSettingsPath = join(root, 'src', 'lib', 'site-settings.ts');
const adminPagePath = join(root, 'src', 'pages', 'admin', 'site-settings.astro');
const adminApiPath = join(root, 'src', 'pages', 'api', 'admin', 'site-settings.ts');

assertExists(adminPagePath, 'missing admin page: src/pages/admin/site-settings.astro');
assertExists(adminApiPath, 'missing admin API: src/pages/api/admin/site-settings.ts');
assertExists(homepagePath, 'missing homepage: src/pages/index.astro');
assertExists(siteSettingsPath, 'missing site settings library: src/lib/site-settings.ts');

if (existsSync(homepagePath)) {
  const source = readFileSync(homepagePath, 'utf8');
  const requiredTokens = [
    'getPublicSiteSettings',
    'homepageSections',
    '<Hero settings={publicSiteSettings.hero} />',
    '<CityUtilities services={publicSiteSettings.cityServices} />',
  ];
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      blockers.push(`src/pages/index.astro missing admin-driven token: ${token}`);
    }
  }
}

if (existsSync(siteSettingsPath)) {
  const source = readFileSync(siteSettingsPath, 'utf8');
  const requiredServiceSlugs = ['nobetci-eczaneler', 'otobus-saatleri', 'ucak-saatleri'];
  for (const slug of requiredServiceSlugs) {
    if (!source.includes(`slug: '${slug}'`)) {
      blockers.push(`src/lib/site-settings.ts missing city service slug: ${slug}`);
    }
  }
}

if (blockers.length > 0) {
  console.error('[admin-homepage] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[admin-homepage] ok: admin-driven homepage management contract is locked');

function assertExists(path: string, message: string): void {
  if (!existsSync(path)) {
    blockers.push(message);
  }
}
