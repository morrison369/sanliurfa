#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'src/lib/city-content-agents.ts',
  'src/pages/api/admin/city-content-agents.ts',
  'src/pages/admin/content-agents.astro',
  'src/migrations/161_city_content_agents.ts',
  'docs/SEHIR_ICERIK_AJANLARI.md',
  'src/pages/api/docs/openapi.json.ts',
  'scripts/smoke/city-content-acceptance.mjs',
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('[city-content-agents] missing files:');
  for (const file of missing) console.error(` - ${file}`);
  process.exit(1);
}

const lib = readFileSync('src/lib/city-content-agents.ts', 'utf8');
const docs = readFileSync('docs/SEHIR_ICERIK_AJANLARI.md', 'utf8');
const llms = readFileSync('src/pages/llms.txt.ts', 'utf8');
const openapi = readFileSync('src/pages/api/docs/openapi.json.ts', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const requiredSignals = [
  'city-service-agent',
  'culture-event-agent',
  'place-enrichment-agent',
  'recipe-content-agent',
  'image-import-agent',
  'seo-geo-agent',
  'autoPublish: false',
  'Pexels',
  'Unsplash',
  'Şanlıurfa',
  'isCityContentAgentKey',
  'CityContentAgentError',
  '/api/admin/site/media/search',
  '/api/admin/site/media/import',
];

for (const signal of requiredSignals) {
  if (!lib.includes(signal) && !docs.includes(signal) && !llms.includes(signal)) {
    console.error(`[city-content-agents] missing signal: ${signal}`);
    process.exit(1);
  }
}

if (!llms.includes('Şanlıurfa yemek tarifleri') || !llms.includes('Şanlıurfa nöbetçi eczaneler')) {
  console.error('[city-content-agents] llms.txt surface missing critical city content links');
  process.exit(1);
}

if (!openapi.includes('/admin/city-content-agents')) {
  console.error('[city-content-agents] OpenAPI surface missing /admin/city-content-agents');
  process.exit(1);
}

if (!pkg.scripts?.['smoke:city-content:acceptance']) {
  console.error('[city-content-agents] package script missing smoke:city-content:acceptance');
  process.exit(1);
}

console.log('[city-content-agents] ok: admin api/page, migration, docs and llms surface present');
