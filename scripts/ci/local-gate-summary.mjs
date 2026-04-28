#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'local-gate-summary.json');
const outMd = path.join(root, 'docs', 'local-gate-summary.md');

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const openapiP0 = readJson('docs/openapi-p0-closure-report.json');
const problemJson = readJson('docs/problem-json-report.json');
const releaseReadiness = readJson('docs/release-readiness.json');
const migrationDuplicate = readJson('docs/migration-duplicate-report.json');
const migrationDebt = readJson('docs/migration-debt-report.json');
const categoryGap = readJson('docs/category-gap-report.json');
const contentCluster = readJson('docs/content-cluster-quality-report.json');
const contentProgrammatic = readJson('docs/content-programmatic-quality-report.json');
const imageModeration = readJson('docs/image-moderation-report.json');
const openapiSummary = readJson('sdk/generated/openapi-summary.json');

const duplicateNumberCount = Object.keys(migrationDuplicate?.duplicateNumbers || {}).length;
const duplicateSlugCount = Object.keys(migrationDuplicate?.duplicateSlugs || {}).length;
const newDuplicateNumberCount = Number(migrationDebt?.totals?.newDuplicateNumberGroups || 0);
const newDuplicateSlugCount = Number(migrationDebt?.totals?.newDuplicateSlugGroups || 0);

const checks = [
  {
    id: 'release-readiness',
    status: releaseReadiness?.status === 'ready' ? 'ok' : 'blocked',
    value: releaseReadiness?.status || 'missing',
    artifact: 'docs/release-readiness.json',
  },
  {
    id: 'openapi-p0',
    status: Number(openapiP0?.totalMissing || 0) === 0 ? 'ok' : 'blocked',
    value: Number(openapiP0?.totalMissing || 0),
    artifact: 'docs/openapi-p0-closure-report.json',
  },
  {
    id: 'openapi-route-count',
    status: Number(openapiP0?.documentedPaths || 0) === Number(openapiP0?.fileRoutes || 0) ? 'ok' : 'blocked',
    value: `${Number(openapiP0?.documentedPaths || 0)}/${Number(openapiP0?.fileRoutes || 0)}`,
    artifact: 'docs/openapi-p0-closure-report.json',
  },
  {
    id: 'problem-json',
    status: Number(problemJson?.offenders || 0) === 0 ? 'ok' : 'blocked',
    value: Number(problemJson?.offenders || 0),
    artifact: 'docs/problem-json-report.json',
  },
  {
    id: 'category-coverage',
    status:
      Number(categoryGap?.summary?.missingDbActiveCategorySlugs || 0) === 0 &&
      Number(categoryGap?.summary?.missingHomepageQuickSlugs || 0) === 0
        ? 'ok'
        : 'blocked',
    value: `db=${Number(categoryGap?.summary?.missingDbActiveCategorySlugs || 0)}, homepage=${Number(categoryGap?.summary?.missingHomepageQuickSlugs || 0)}`,
    artifact: 'docs/category-gap-report.json',
  },
  {
    id: 'content-cluster-quality',
    status: Number(contentCluster?.issueCount || 0) === 0 ? 'ok' : 'blocked',
    value: Number(contentCluster?.issueCount || 0),
    artifact: 'docs/content-cluster-quality-report.json',
  },
  {
    id: 'content-programmatic-quality',
    status: Number(contentProgrammatic?.issueCount || 0) === 0 ? 'ok' : 'blocked',
    value: Number(contentProgrammatic?.issueCount || 0),
    artifact: 'docs/content-programmatic-quality-report.json',
  },
  {
    id: 'image-moderation',
    status: Number(imageModeration?.blocked || imageModeration?.blockedCount || 0) === 0 ? 'ok' : 'blocked',
    value: Number(imageModeration?.blocked || imageModeration?.blockedCount || 0),
    artifact: 'docs/image-moderation-report.json',
  },
  {
    id: 'sdk-generated',
    status: exists('sdk/generated/client.ts') && exists('sdk/generated/client.js') ? 'ok' : 'blocked',
    value: openapiSummary?.generatedAt || 'present',
    artifact: 'sdk/generated/openapi-summary.json',
  },
  {
    id: 'migration-duplicate-debt',
    status: newDuplicateNumberCount === 0 && newDuplicateSlugCount === 0 ? 'ok' : 'advisory',
    value: `known numbers=${duplicateNumberCount}, known slugs=${duplicateSlugCount}, new numbers=${newDuplicateNumberCount}, new slugs=${newDuplicateSlugCount}`,
    artifact: 'docs/migration-debt-report.json',
  },
];

const blocked = checks.filter((check) => check.status === 'blocked');
const advisory = checks.filter((check) => check.status === 'advisory');
const summary = {
  generatedAt: new Date().toISOString(),
  status: blocked.length > 0 ? 'blocked' : advisory.length > 0 ? 'ready_with_advisories' : 'ready',
  checks,
  totals: {
    ok: checks.filter((check) => check.status === 'ok').length,
    advisory: advisory.length,
    blocked: blocked.length,
  },
};

fs.writeFileSync(outJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

const lines = [
  '# Local Gate Summary',
  '',
  `- Generated At: ${summary.generatedAt}`,
  `- Status: ${summary.status}`,
  `- OK: ${summary.totals.ok}`,
  `- Advisory: ${summary.totals.advisory}`,
  `- Blocked: ${summary.totals.blocked}`,
  '',
  '## Checks',
  '',
  '| Check | Status | Value | Artifact |',
  '|---|---|---:|---|',
];

for (const check of checks) {
  lines.push(`| ${check.id} | ${check.status} | ${check.value} | \`${check.artifact}\` |`);
}

lines.push('');
lines.push(
  summary.status === 'blocked'
    ? 'Summary: Yerel gate ozeti blocked durumda.'
    : summary.status === 'ready_with_advisories'
      ? 'Summary: Release gate hazir; advisory teknik borclar takip edilmeli.'
      : 'Summary: Yerel gate ozeti hazir.',
);

fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');

console.log(`Local gate summary written: ${outJson}`);
console.log(`Local gate summary written: ${outMd}`);
