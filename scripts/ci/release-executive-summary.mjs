#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'release-executive-summary.json');
const outMd = path.join(docsDir, 'release-executive-summary.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const dashboard = readJsonSafe('docs/release-readiness-dashboard.json');
const quality = readJsonSafe('quality-metrics.json');
const nextActions = readJsonSafe('docs/release-next-actions-report.json');
const pagespeed = readJsonSafe('docs/pagespeed-api-less-lighthouse-report.json');
const media = readJsonSafe('docs/media-readiness-report.json');
const adminRole = readJsonSafe('docs/admin-strict-role-gate.json');
const redis = readJsonSafe('docs/redis-runtime-health-report.json');
const blogDuplicateRisk = readJsonSafe('docs/blog-duplicate-risk-gate.json');
const adsense = readJsonSafe('docs/adsense-live-readiness-report.json') || readJsonSafe('docs/adsense-readiness-report.json');
const publisher =
  readJsonSafe('docs/publisher-center-live-readiness-report.json') ||
  readJsonSafe('docs/publisher-center-readiness-report.json');

const actions = Array.isArray(nextActions?.actions) ? nextActions.actions : [];
const dbAction = actions.find((item) => item?.area === 'database');
const pagespeedClassification =
  pagespeed?.results?.[0]?.reviewClassification?.bestPractices?.classification ?? null;
const isPassed = (report) => ['ok', 'passed', 'published'].includes(report?.status);

const report = {
  generatedAt: new Date().toISOString(),
  status: dashboard?.decision === 'BLOCKED' ? 'blocked' : 'ready_with_advisories',
  decision: dashboard?.decision ?? 'UNKNOWN',
  summary: {
    blockers: dashboard?.ready === false ? 1 : 0,
    advisoryCount: Array.isArray(dashboard?.advisoryReasons) ? dashboard.advisoryReasons.length : 0,
    nextActionCount: nextActions?.summary?.actionCount ?? 0,
    blockingActionCount: nextActions?.summary?.blockingActionCount ?? 0,
    waitingActionCount: nextActions?.summary?.waitingActionCount ?? 0,
  },
  passed: {
    mediaReadiness: media?.status === 'ok',
    adminStrictRole: adminRole?.status === 'ok',
    blogDuplicateRisk: blogDuplicateRisk?.status === 'ok',
    adsenseReadiness: isPassed(adsense),
    publisherCenterReadiness: isPassed(publisher),
  },
  expectedExternalReviews: [
    ...(pagespeedClassification === 'external_expected_review'
      ? [
          {
            area: 'pagespeed-api-less',
            reason: 'AdSense / DoubleClick third-party test_cookie Lighthouse best-practices review.',
            releaseBlocker: false,
          },
        ]
      : []),
  ],
  advisories: {
    database: dbAction
      ? {
          title: dbAction.title ?? 'DB observation',
          detail: dbAction.detail ?? '',
          dueAfter: dbAction.dueAfter ?? null,
          automaticDropAllowed: false,
        }
      : null,
    redis: redis
      ? {
          status: redis.status ?? 'unknown',
          mode: redis.status === 'idle' ? 'optional-fail-open' : 'active',
          releaseBlocker: redis?.policy?.releaseBlocker === true,
          fallbackAllowed: redis?.policy?.fallbackAllowed === true,
        }
      : null,
  },
  quality: {
    lintOk: quality?.blockerGates?.lintOk ?? null,
    typecheckOk: quality?.blockerGates?.typecheckOk ?? null,
    openapiOk: quality?.blockerGates?.openapiOk ?? null,
    mediaReadinessOk: quality?.blockerGates?.mediaReadinessOk ?? null,
    adminStrictRoleOk: quality?.blockerGates?.adminStrictRoleOk ?? null,
  },
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Release Executive Summary',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Decision: ${report.decision}`,
    `- Status: ${report.status}`,
    `- Advisory count: ${report.summary.advisoryCount}`,
    `- Blocking actions: ${report.summary.blockingActionCount}`,
    `- Waiting actions: ${report.summary.waitingActionCount}`,
    '',
    '## Passed Gates',
    '',
    ...Object.entries(report.passed).map(([key, value]) => `- ${key}: ${value ? 'yes' : 'no'}`),
    '',
    '## Expected External Reviews',
    '',
    ...(report.expectedExternalReviews.length
      ? report.expectedExternalReviews.map(
          (item) => `- ${item.area}: ${item.reason} Release blocker: ${item.releaseBlocker ? 'yes' : 'no'}`,
        )
      : ['- none']),
    '',
    '## Advisories',
    '',
    `- Database: ${report.advisories.database?.detail || 'none'}`,
    `- Redis: ${report.advisories.redis ? `${report.advisories.redis.status}, mode=${report.advisories.redis.mode}, blocker=${report.advisories.redis.releaseBlocker ? 'yes' : 'no'}` : 'not-run'}`,
    '',
  ].join('\n'),
  'utf8',
);

console.log(`release-executive-summary: ${report.status.toUpperCase()} decision=${report.decision}`);
process.exit(report.status === 'blocked' ? 1 : 0);
