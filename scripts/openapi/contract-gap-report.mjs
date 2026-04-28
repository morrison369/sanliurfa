#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'openapi-contract-gap-report.json');
const outMd = path.join(root, 'docs', 'openapi-contract-gap-report.md');

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function readText(rel) {
  try {
    return readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

const tiers = readJson('docs/openapi-route-tiers.json');
const config = readText('vitest.api-contract.config.ts');
const rows = Array.isArray(tiers?.rows) ? tiers.rows : [];

const coverageRules = [
  [/^\/collections(\/|$)/, 'openapi-p1-collections-contract.test.ts'],
  [/^\/events(\/|$)/, 'openapi-p1-events-favorites-contract.test.ts'],
  [/^\/favorites(\/|$)/, 'openapi-p1-events-favorites-contract.test.ts'],
  [/^\/feed(\/|$)/, 'openapi-p1-social-discovery-contract.test.ts'],
  [/^\/followers(\/|$)/, 'openapi-p1-social-discovery-contract.test.ts'],
  [/^\/following(\/|$)/, 'openapi-p1-social-discovery-contract.test.ts'],
  [/^\/leaderboard$/, 'openapi-p1-social-discovery-contract.test.ts'],
  [/^\/leaderboards(\/|$)/, 'openapi-p1-social-discovery-contract.test.ts'],
  [/^\/messages(\/|$)/, 'openapi-p1-messages-notifications-contract.test.ts'],
  [/^\/notifications(\/|$)/, 'openapi-p1-messages-notifications-contract.test.ts'],
  [/^\/places(\/|$)/, 'places-* api contract tests'],
  [/^\/social\/capabilities$/, 'social-capabilities-api.test.ts'],
  [/^\/social\/events\/stream$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/feed$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/follow$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/followers$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/follows$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/match-candidates$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/matches$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/messages(\/|$)/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/match-profile$/, 'social-match-profile-api.test.ts'],
  [/^\/social\/swipe$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/social\/trending$/, 'openapi-p1-social-core-contract.test.ts'],
  [/^\/users\/suggestions$/, 'users-suggestions-api.test.ts'],
  [/^\/admin\/system\/release-status$/, 'admin-release-status-api.test.ts'],
  [/^\/admin\/site\/media\/provider-health$/, 'admin-provider-health-api.test.ts'],
  [/^\/docs\/openapi\.json$/, 'openapi-contract.test.ts'],
];

function coveredBy(route) {
  for (const [pattern, source] of coverageRules) {
    if (pattern.test(route) && config.includes(source.split(' ')[0])) return source;
  }
  return null;
}

const candidates = rows
  .filter((row) => row.tier === 'P1' || row.tier === 'P2')
  .map((row) => ({
    route: row.route,
    tier: row.tier,
    methods: row.methods,
    contract: coveredBy(row.route),
  }));

const gaps = candidates.filter((row) => !row.contract);
const totals = {
  P1: candidates.filter((row) => row.tier === 'P1').length,
  P2: candidates.filter((row) => row.tier === 'P2').length,
  coveredP1: candidates.filter((row) => row.tier === 'P1' && row.contract).length,
  coveredP2: candidates.filter((row) => row.tier === 'P2' && row.contract).length,
  gapP1: gaps.filter((row) => row.tier === 'P1').length,
  gapP2: gaps.filter((row) => row.tier === 'P2').length,
};

const topPriority = gaps
  .sort((a, b) => (a.tier === b.tier ? a.route.localeCompare(b.route) : a.tier.localeCompare(b.tier)))
  .slice(0, 30);

const report = {
  generatedAt: new Date().toISOString(),
  status: 'ok',
  totals,
  topPriority,
  note: 'Bu rapor P1/P2 contract test borcunu onceliklendirir; gate blocker degildir.',
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# OpenAPI Contract Gap Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- P1 Routes: ${totals.P1}`,
    `- P1 Covered: ${totals.coveredP1}`,
    `- P1 Gap: ${totals.gapP1}`,
    `- P2 Routes: ${totals.P2}`,
    `- P2 Covered: ${totals.coveredP2}`,
    `- P2 Gap: ${totals.gapP2}`,
    '',
    '| Tier | Route | Methods |',
    '|---|---|---|',
    ...topPriority.map((row) => `| ${row.tier} | \`${row.route}\` | ${row.methods.join(', ')} |`),
    '',
    'Not: P0 kapalıdır; bu rapor P1/P2 contract test planlaması içindir.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`OpenAPI contract gap report written: ${outJson}`);
console.log(`OpenAPI contract gap report written: ${outMd}`);
