import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

const dodPath = join(root, 'docs', 'RELEASE_DEFINITION_OF_DONE.md');
const acceptancePath = join(root, 'docs', 'LIVE_ACCEPTANCE_CHECKLIST.md');
const indexPagePath = join(root, 'src', 'pages', 'index.astro');
const siteSettingsPath = join(root, 'src', 'lib', 'site-settings.ts');

if (!existsSync(dodPath)) {
  blockers.push('docs/RELEASE_DEFINITION_OF_DONE.md is missing');
}

if (!existsSync(acceptancePath)) {
  blockers.push('docs/LIVE_ACCEPTANCE_CHECKLIST.md is missing');
}

if (existsSync(dodPath)) {
  const dodSource = readFileSync(dodPath, 'utf8');
  const requiredDodTokens = [
    'Temel Ürün Akışları',
    'Admin-Driven İçerik Yönetimi',
    'SEO/AEO/GEO Kriterleri',
    'Zorunlu Gate Komutları',
    '/api/admin/system/content-quality',
    'npm run security:homepage-data-contract',
    'npm run security:place-quality-contract',
    'npm run release:ship',
  ];

  for (const token of requiredDodTokens) {
    if (!dodSource.includes(token)) {
      blockers.push(`RELEASE_DEFINITION_OF_DONE.md missing section: ${token}`);
    }
  }
}

if (existsSync(indexPagePath)) {
  const homepageSource = readFileSync(indexPagePath, 'utf8');
  const requiredHomepageTokens = [
    'getPublicSiteSettings',
    'homepageSections',
    '<Hero settings={publicSiteSettings.hero} />',
  ];
  for (const token of requiredHomepageTokens) {
    if (!homepageSource.includes(token)) {
      blockers.push(`src/pages/index.astro missing admin-driven token: ${token}`);
    }
  }
} else {
  blockers.push('src/pages/index.astro is missing');
}

if (existsSync(siteSettingsPath)) {
  const settingsSource = readFileSync(siteSettingsPath, 'utf8');
  const requiredServiceSlugs = ['nobetci-eczaneler', 'otobus-saatleri', 'ucak-saatleri'];
  for (const serviceSlug of requiredServiceSlugs) {
    if (!settingsSource.includes(`slug: '${serviceSlug}'`)) {
      blockers.push(`src/lib/site-settings.ts missing city service slug: ${serviceSlug}`);
    }
  }
} else {
  blockers.push('src/lib/site-settings.ts is missing');
}

if (blockers.length > 0) {
  console.error('[release-definition] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[release-definition] ok: release definition and acceptance checklist are locked');
