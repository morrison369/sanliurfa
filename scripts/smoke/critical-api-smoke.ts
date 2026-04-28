#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const openApiRouteFile = path.join(repoRoot, 'src', 'pages', 'api', 'docs', 'openapi.json.ts');

const requiredPaths = [
  '/auth/login',
  '/auth/register',
  '/places',
  '/places/{id}',
  '/places/{id}/photos',
  '/places/{id}/availability',
  '/places/{id}/review-analytics',
  '/places/{id}/rating-distribution',
  '/places/{id}/request-verification',
  '/search',
  '/search/advanced',
  '/user/favorites',
  '/admin/dashboard',
  '/v2/favorites',
];

const requiredRefs = [
  {
    name: 'places availability response schema ref',
    getRef: (spec: any) =>
      spec?.paths?.['/places/{id}/availability']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceAvailabilityResponse',
  },
  {
    name: 'review analytics response schema ref',
    getRef: (spec: any) =>
      spec?.paths?.['/places/{id}/review-analytics']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceReviewAnalyticsResponse',
  },
  {
    name: 'rating distribution response schema ref',
    getRef: (spec: any) =>
      spec?.paths?.['/places/{id}/rating-distribution']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceRatingDistributionResponse',
  },
  {
    name: 'request verification response schema ref',
    getRef: (spec: any) =>
      spec?.paths?.['/places/{id}/request-verification']?.post?.responses?.['201']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    expected: '#/components/schemas/PlaceRequestVerificationResponse',
  },
  {
    name: 'user favorites 401 error schema ref',
    getRef: (spec: any) =>
      spec?.paths?.['/user/favorites']?.get?.responses?.['401']?.content?.['application/json']?.schema
        ?.$ref,
    expected: '#/components/schemas/ErrorBasic',
  },
  {
    name: 'admin dashboard 401 error schema ref',
    getRef: (spec: any) =>
      spec?.paths?.['/admin/dashboard']?.get?.responses?.['401']?.content?.['application/json']?.schema
        ?.$ref,
    expected: '#/components/schemas/ErrorBasic',
  },
];

async function loadSpec() {
  const moduleUrl = pathToFileURL(openApiRouteFile).href;
  const mod = await import(moduleUrl);
  if (typeof mod.GET !== 'function') {
    throw new Error('OpenAPI route GET handler not found');
  }
  const response = await mod.GET({} as any);
  if (response?.status !== 200) {
    throw new Error(`OpenAPI endpoint status is ${response?.status}`);
  }
  return response.json();
}

function fail(message: string) {
  console.error(`FAILED: ${message}`);
  process.exitCode = 1;
}

async function main() {
  const spec = await loadSpec();
  const allPaths = spec?.paths ?? {};

  console.log('Critical API smoke');
  console.log(` - path count: ${Object.keys(allPaths).length}`);

  for (const p of requiredPaths) {
    if (!allPaths[p]) {
      fail(`missing OpenAPI path: ${p}`);
    }
  }

  for (const check of requiredRefs) {
    const actual = check.getRef(spec);
    if (actual !== check.expected) {
      fail(`${check.name} mismatch (expected: ${check.expected}, got: ${String(actual)})`);
    }
  }

  if (process.exitCode === 1) return;
  console.log('OK: critical OpenAPI checks passed');
}

main().catch((error: Error) => {
  console.error(`FAILED: ${error.message}`);
  process.exitCode = 1;
});
