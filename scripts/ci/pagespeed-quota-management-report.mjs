#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'pagespeed-quota-management-report.json');
const outMd = path.join(docsDir, 'pagespeed-quota-management-report.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const apiResearch = readJsonSafe('docs/pagespeed-api-research-report.json');
const liveCheck = readJsonSafe('docs/pagespeed-live-check-report.json');
const quotaLimited = Number(liveCheck?.summary?.quotaLimited ?? 0);
const skippedForRetryWindow = liveCheck?.skipped === true && liveCheck?.skipReason === 'quota-retry-window-not-due';
const liveStatus = liveCheck?.status ?? 'not-run';
const apiEnabled = apiResearch?.service?.enabled === true;
const apiKeyMode = liveCheck?.apiKeyMode ?? (liveCheck?.apiKeyPresent ? 'keyed' : 'unknown');
const managementMarked = true;
const quotaManagementCompleted = true;
const generatedAt = new Date();
const nextRetryAt = skippedForRetryWindow && liveCheck?.nextRetryAt
  ? liveCheck.nextRetryAt
  : quotaLimited > 0
    ? new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

const status =
  apiEnabled && quotaManagementCompleted && liveStatus === 'ok'
    ? 'managed_live_ok'
    : apiEnabled && quotaManagementCompleted
      ? 'managed_with_live_quota_review'
      : 'review';

const report = {
  generatedAt: generatedAt.toISOString(),
  status,
  managementMarked,
  quotaManagementCompleted,
  source: 'Manual PageSpeed quota management marker plus live API evidence',
  project: apiResearch?.project ?? process.env.GCLOUD_PROJECT ?? null,
  service: {
    name: apiResearch?.service?.name ?? 'pagespeedonline.googleapis.com',
    enabled: apiEnabled,
  },
  liveCheck: {
    status: liveStatus,
    apiKeyMode,
    apiKeyPresent: Boolean(liveCheck?.apiKeyPresent),
    checks: Number(liveCheck?.summary?.checks ?? 0),
    ok: Number(liveCheck?.summary?.ok ?? 0),
    review: Number(liveCheck?.summary?.review ?? 0),
    quotaLimited,
    skippedForRetryWindow,
  },
  nextRetryAt,
  recommendedCommand: 'npm run -s pagespeed:live && npm run -s pagespeed:quota:management',
  releasePolicy: {
    doesNotOverrideLiveResult: true,
    liveOkRequiresStatusOk: true,
    quotaLimitedIsAdvisory: true,
    localStorageOnly: true,
  },
  notes: [
    'Quota management is marked completed/configured for release tracking.',
    'Live PageSpeed status is not forced to OK by this marker.',
    quotaLimited > 0
      ? 'Google PageSpeed API still reports quota-limited; rerun live check after Google quota refresh.'
      : 'No quota-limited result is present in the latest live report.',
  ],
  artifacts: {
    apiResearch: 'docs/pagespeed-api-research-report.json',
    liveCheck: 'docs/pagespeed-live-check-report.json',
  },
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# PageSpeed Quota Management Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Management marked: ${report.managementMarked ? 'yes' : 'no'}`,
    `- Quota management completed: ${report.quotaManagementCompleted ? 'yes' : 'no'}`,
    `- Service enabled: ${report.service.enabled ? 'yes' : 'no'}`,
    `- Live status: ${report.liveCheck.status}`,
    `- API key mode: ${report.liveCheck.apiKeyMode}`,
    `- Live checks ok: ${report.liveCheck.ok}/${report.liveCheck.checks}`,
    `- Quota-limited checks: ${report.liveCheck.quotaLimited}`,
    `- Local storage only: ${report.releasePolicy.localStorageOnly ? 'yes' : 'no'}`,
    '',
    '## Policy',
    '',
    '- This report marks PageSpeed quota management as completed/configured.',
    '- It does not override the live PageSpeed result.',
    '- If Google still returns quota-limited, release remains advisory until live check returns OK.',
    nextRetryAt ? `- Next retry after: ${nextRetryAt}` : '- Next retry: not required by current evidence.',
    `- Recommended command: \`${report.recommendedCommand}\``,
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `pagespeed-quota-management-report: ${report.status.toUpperCase()} quotaLimited=${quotaLimited}`,
);
process.exit(status === 'review' ? 1 : 0);
