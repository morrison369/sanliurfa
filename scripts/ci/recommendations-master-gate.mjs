#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

function requireFile(rel) {
  if (!existsSync(resolve(root, rel))) {
    errors.push(`${rel}: missing`);
    return false;
  }
  return true;
}

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

function requireAnyToken(rel, tokens) {
  const full = resolve(root, rel);
  if (!existsSync(full)) {
    errors.push(`${rel}: missing`);
    return;
  }
  const content = readFileSync(full, 'utf8');
  if (!tokens.some((token) => content.includes(token))) {
    errors.push(`${rel}: missing one of [${tokens.join(', ')}]`);
  }
}

// 1) Gate-first release model
requireToken('package.json', '"gate:done"');
requireToken('package.json', '"api:release:gate"');

// 2) Admin DB-first site management
requireFile('src/components/admin/SiteContentManager.tsx');
requireFile('src/pages/admin/site-content.astro');
requireToken('src/pages/api/admin/site/settings.ts', 'request_approval');
requireToken('src/pages/api/admin/site/settings.ts', 'approve_publish');
requireToken('src/pages/index.astro', "getSiteSettingRequired('homepage.hero'");
requireToken('src/pages/index.astro', "getSiteSettingRequired('homepage.seo'");
requireToken('src/pages/index.astro', "getSiteSettingRequired('homepage.schema'");

// 3) Landing core city blocks
requireFile('src/pages/saglik/nobetci-eczaneler.astro');
requireFile('src/pages/ulasim/otobus-saatleri.astro');
requireFile('src/pages/ulasim/ucak-saatleri.astro');
requireFile('src/pages/api/saglik/nobetci.ts');
requireFile('src/pages/api/transport/status.ts');

// 4) Social safety
requireFile('src/pages/api/social/messages.ts');
requireFile('src/pages/api/social/swipe.ts');
requireFile('src/pages/api/social/follow.ts');
requireToken('src/pages/api/social/messages.ts', 'social_abuse');
requireToken('src/pages/api/social/swipe.ts', 'social_abuse');
requireToken('src/pages/api/social/follow.ts', 'social_abuse');

// 5) Place lifecycle standard
requireFile('src/pages/api/admin/places/lifecycle.ts');
requireFile('src/pages/api/admin/places/lifecycle/sla.ts');
requireToken('src/pages/api/admin/places/lifecycle.ts', 'place_lifecycle_events');
requireToken('src/lib/place/lifecycle-events.ts', 'recordPlaceLifecycleEvent');
requireToken('src/pages/api/admin/places/lifecycle/sla.ts', 'export const POST');
requireToken('src/pages/api/admin/places/lifecycle/sla.ts', 'sla_action');

// 6) Image pipeline
requireToken('package.json', '"images:pipeline:db"');
requireToken('package.json', '"images:moderation:sync-db"');
requireFile('scripts/content-scraper/map-images-to-content.ts');
requireFile('scripts/content-scraper/sync-image-moderation-to-site-media.ts');
requireFile('scripts/ci/slug-image-naming-gate.mjs');
requireToken('package.json', '"categories:coverage:gate"');

// 7) Canonical + redirects
requireAnyToken('src/middleware.ts', [
  "const canonicalHost = 'sanliurfa.com';",
  'const canonicalHost = getCanonicalDomain();',
]);
requireToken('src/middleware.ts', '301');
requireToken('package.json', '"canonical:domain:gate"');

// 8) Single-process runtime discipline
requireToken('package.json', '"dev:isolated:ensure"');
requireToken('package.json', '"dev:isolated:check-no-orphan"');
requireFile('scripts/runtime/dev-daemon.mjs');

// 9) CWP ops readiness
requireToken('package.json', '"ops:cwp:preflight"');
requireToken('package.json', '"ops:cwp:release-readiness"');
requireToken('package.json', '"ops:cwp:release:bundle"');
requireToken('package.json', '"ops:cwp:oneshot"');
requireFile('scripts/prod-cwp-ops.sh');
requireFile('scripts/cwp-release-bundle.sh');

// 10) Test and smoke breadth
requireToken('package.json', '"test:api-contract:coverage"');
requireToken('package.json', '"test:e2e:social:phase1"');
requireToken('package.json', '"openapi:city-services:gate"');
requireToken('package.json', '"sdk:generate:check"');
requireToken('package.json', '"landing:agency:gate"');
requireToken('package.json', '"public:city:gate"');
requireToken('package.json', '"smoke:pages:critical"');
requireToken('package.json', '"smoke:images:critical"');
requireToken('package.json', '"ops:cwp:deploy:evidence"');
requireToken('package.json', '"jobs:content:quality"');

// 11) Public city MVP acceptance
requireFile('scripts/ci/public-city-acceptance-gate.mjs');
requireFile('scripts/smoke/city-content-acceptance.mjs');
requireFile('.github/workflows/public-city-gate.yml');
requireToken('scripts/ci/next-bulk-ops.mjs', 'npm run public:city:gate');
requireToken('docs/MVP_PUBLIC_ACCEPTANCE.md', 'npm run public:city:gate');
requireToken('docs/MVP_BITIRME_MODU.md', 'npm run public:city:gate');
requireToken('.github/workflows/public-city-gate.yml', 'npm run public:city:gate:build');
requireToken('.github/workflows/public-city-gate.yml', 'branches: [master, main, develop]');

if (errors.length) {
  console.error('[recommendations-master-gate] FAILED');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[recommendations-master-gate] ok');
