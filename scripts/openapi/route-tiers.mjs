#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'openapi-route-tiers.json');
const outMd = path.join(root, 'docs', 'openapi-route-tiers.md');
const openApiRouteFile = path.join(root, 'src', 'pages', 'api', 'docs', 'openapi.json.ts');

const p0Prefixes = [
  '/auth',
  '/health',
  '/admin/site',
  '/admin/system',
  '/places',
  '/reviews',
  '/search',
];
const p1Prefixes = [
  '/social',
  '/messages',
  '/notifications',
  '/followers',
  '/following',
  '/feed',
  '/leaderboard',
  '/leaderboards',
  '/events',
  '/favorites',
  '/collections',
];

function tierFor(route) {
  if (p0Prefixes.some((prefix) => route.startsWith(prefix))) return 'P0';
  if (p1Prefixes.some((prefix) => route.startsWith(prefix))) return 'P1';
  return 'P2';
}

async function getOpenApiSpec() {
  const mod = await import(pathToFileURL(openApiRouteFile).href);
  const response = await mod.GET({});
  if (!response || response.status !== 200) {
    throw new Error(`openapi GET failed with status ${response?.status}`);
  }
  return response.json();
}

const spec = await getOpenApiSpec();
const routes = Object.keys(spec?.paths || {}).sort();
const rows = routes.map((route) => ({
  route,
  tier: tierFor(route),
  methods: Object.keys(spec.paths[route] || {}).map((method) => method.toUpperCase()).sort(),
}));
const totals = rows.reduce(
  (acc, row) => {
    acc[row.tier] += 1;
    return acc;
  },
  { P0: 0, P1: 0, P2: 0 },
);

const report = {
  generatedAt: new Date().toISOString(),
  status: totals.P0 > 0 && rows.length > 0 ? 'ok' : 'blocked',
  totalRoutes: rows.length,
  totals,
  rows,
};

writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# OpenAPI Route Tiers',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Total Routes: ${report.totalRoutes}`,
    `- P0: ${totals.P0}`,
    `- P1: ${totals.P1}`,
    `- P2: ${totals.P2}`,
    '',
    '| Tier | Route | Methods |',
    '|---|---|---|',
    ...rows.map((row) => `| ${row.tier} | \`${row.route}\` | ${row.methods.join(', ')} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`OpenAPI route tiers written: ${outJson}`);
console.log(`OpenAPI route tiers written: ${outMd}`);
if (report.status !== 'ok') process.exit(1);
