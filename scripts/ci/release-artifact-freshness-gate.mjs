#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'release-artifact-freshness.json');
const outMd = path.join(docsDir, 'release-artifact-freshness.md');
const maxAgeMinutes = Number.parseInt(process.env.RELEASE_ARTIFACT_MAX_AGE_MINUTES || '180', 10);
const now = Date.now();
const blogPublishReadinessPath = path.join(root, 'docs', 'blog-publish-readiness-report.json');
const blogPublishReadiness = readJsonSafe(blogPublishReadinessPath);

const artifacts = [
  'quality-metrics.json',
  'docs/quality-reports-refresh.json',
  'docs/quality-check-report.json',
  'docs/release-readiness.json',
  'docs/release-readiness-dashboard.json',
  'docs/release-next-actions-report.json',
  'docs/release-handoff-summary.json',
  'docs/release-executive-summary.json',
  'docs/local-upload-parity-report.json',
  'docs/local-upload-candidate-classification.json',
  'docs/local-upload-archive-candidates.json',
  'docs/local-media-storage-gate.json',
  'docs/media-readiness-report.json',
  'docs/admin-strict-role-gate.json',
  'docs/unit-skip-report.json',
  'docs/db-retirement-observation-report.json',
  'docs/db-p0-quarantine-plan.json',
  'docs/db-observation-cadence-report.json',
  'docs/db-observation-calendar-report.json',
  'docs/db-manual-decision-readiness-report.json',
  'docs/db-registry-classification-report.json',
  'docs/db-runtime-hold-plan.json',
  'docs/sql-parameter-safety-gate.json',
  'docs/db-prod-version-compare-report.json',
  'docs/db-index-review-plan.json',
  'docs/db-advisory-evidence-bundle.json',
  'docs/unit-test-report.json',
  'docs/unit-skip-report.json',
  'docs/e2e-skip-report.json',
  'docs/e2e-critical-coverage-report.json',
  'docs/api-contract-group-report.json',
  'docs/api-release-gate-report.json',
  'docs/api-debug-envelope-report.json',
  'docs/adsense-readiness-report.json',
  'docs/adsense-live-readiness-report.json',
  'docs/openapi-p0-closure-report.json',
  'docs/build-artifact-report.json',
  'docs/script-surface-report.json',
  'docs/script-canonical-surface-report.json',
  'docs/migration-duplicate-drift-report.json',
  'docs/local-upload-bucket-quota-report.json',
  'docs/redis-runtime-health-report.json',
  'docs/warmup-safety-report.json',
  'docs/cron-readiness-report.json',
  'docs/internal-linking-report.json',
  'docs/llms-sitemap-auto-update-gate.json',
  'docs/gmaps-scraper-readiness-report.json',
  'docs/gmaps-query-plan-report.json',
  'docs/gmaps-discovery-plan-report.json',
  'docs/gmaps-discovery-drafts-report.json',
  'docs/ollama-readiness-report.json',
  'docs/blog-keyword-research-report.json',
  'docs/blog-duplicate-risk-gate.json',
  'docs/blog-draft-quality-report.json',
  'docs/blog-draft-rich-results-report.json',
  'docs/blog-publish-readiness-report.json',
  'docs/blog-admin-publish-queue-report.json',
  'docs/publish-all-content-drafts-report.json',
  'docs/pagespeed-api-research-report.json',
  'docs/pagespeed-api-less-lighthouse-report.json',
  'docs/pagespeed-live-check-report.json',
  'docs/pagespeed-quota-management-report.json',
  'docs/backend-frontend-improvement-report.json',
  'docs/social-ux-report.json',
  'docs/generated-blog-drafts/apply-summary.json',
  'docs/content-agent-drafts-report.json',
];

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function artifactTimestamp(filePath) {
  const json = readJsonSafe(filePath);
  const generatedAt = json?.generatedAt || json?.timestamp || null;
  const parsed = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  if (!Number.isNaN(parsed)) return { source: 'generatedAt', time: parsed, value: generatedAt };
  const stat = fs.statSync(filePath);
  return { source: 'mtime', time: stat.mtimeMs, value: stat.mtime.toISOString() };
}

const results = artifacts.map((artifact) => {
  const filePath = path.join(root, artifact);
  if (!fs.existsSync(filePath)) {
    return {
      artifact,
      status: 'missing',
      ageMinutes: null,
      timestampSource: null,
      timestamp: null,
    };
  }
  const timestamp = artifactTimestamp(filePath);
  const ageMinutes = Number(((now - timestamp.time) / 60000).toFixed(1));
  const publishedBlogDraftsSupersedeApplySummary =
    artifact === 'docs/generated-blog-drafts/apply-summary.json' &&
    blogPublishReadiness?.status === 'published';
  return {
    artifact,
    status: ageMinutes <= maxAgeMinutes || publishedBlogDraftsSupersedeApplySummary ? 'fresh' : 'stale',
    ageMinutes,
    timestampSource: timestamp.source,
    timestamp: timestamp.value,
    ...(publishedBlogDraftsSupersedeApplySummary
      ? { freshnessPolicy: 'blog-publish-readiness-published-supersedes-apply-summary' }
      : {}),
  };
});

const failed = results.filter((item) => item.status !== 'fresh');
const report = {
  generatedAt: new Date(now).toISOString(),
  status: failed.length === 0 ? 'passed' : 'failed',
  maxAgeMinutes,
  results,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Release Artifact Freshness',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Max age: ${report.maxAgeMinutes} minutes`,
    '',
    '| Artifact | Status | Age Minutes | Timestamp Source | Timestamp | Policy |',
    '|---|---|---:|---|---|---|',
    ...results.map((item) => `| \`${item.artifact}\` | ${item.status} | ${item.ageMinutes ?? ''} | ${item.timestampSource ?? ''} | ${item.timestamp ?? ''} | ${item.freshnessPolicy ?? ''} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`release-artifact-freshness: ${report.status.toUpperCase()} (${failed.length} stale/missing)`);
process.exit(failed.length === 0 ? 0 : 1);
