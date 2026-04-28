#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const maxAgeHours = Number(process.env.RELEASE_EVIDENCE_MAX_AGE_HOURS || 72);
const now = new Date();
const outJson = path.join(root, 'docs', 'release-evidence.json');
const outMd = path.join(root, 'docs', 'RELEASE_EVIDENCE.md');

const required = [
  ['release-status', 'docs/release-status.json', (json) => json?.status === 'ready', 'status=ready'],
  ['local-gate-summary', 'docs/local-gate-summary.json', (json) => json?.status === 'ready', 'status=ready'],
  ['release-readiness', 'docs/release-readiness.json', (json) => json?.status === 'ready', 'status=ready'],
  ['site-doctor', 'docs/site-doctor-report.json', (json) => json?.status === 'ready', 'status=ready'],
  ['openapi-p0', 'docs/openapi-p0-closure-report.json', (json) => Number(json?.totalMissing || 0) === 0, 'totalMissing=0'],
  ['openapi-tiers', 'docs/openapi-route-tiers.json', (json) => json?.status === 'ok', 'status=ok'],
  ['problem-json', 'docs/problem-json-report.json', (json) => Number(json?.offendersCount || json?.offenders || 0) === 0, 'offenders=0'],
  ['auth-log-standard', 'docs/auth-log-standard-report.json', (json) => json?.status === 'ok', 'status=ok'],
  ['env-doctor', 'docs/env-doctor-report.json', (json) => json?.status === 'ok', 'status=ok'],
  ['migration-debt', 'docs/migration-debt-report.json', (json) => json?.status === 'clear', 'status=clear'],
  ['critical-pages-quality', 'docs/critical-pages-quality-report.json', (json) => json?.status === 'ok', 'status=ok'],
  ['image-moderation', 'docs/image-moderation-report.json', (json) => Number(json?.issueCount || 0) === 0, 'issueCount=0'],
  ['prod-evidence', 'docs/prod-evidence.json', (json) => ['ready', 'ready_without_live_probe'].includes(json?.status), 'status=ready|ready_without_live_probe'],
  ['backup-restore-evidence', 'docs/backup-restore-evidence.json', (json) => ['ready', 'advisory'].includes(json?.status), 'status=ready|advisory'],
  ['runtime-prod-doctor', 'docs/runtime-prod-doctor.json', (json) => ['ready', 'ready_with_advisories'].includes(json?.status), 'status=ready|ready_with_advisories'],
  ['security-headers', 'docs/security-headers-snapshot.json', (json) => json?.status === 'ok', 'status=ok'],
  ['admin-turkish-ui', 'docs/admin-turkish-ui-report.json', (json) => json?.status === 'ok', 'status=ok'],
  ['openapi-contract-gaps', 'docs/openapi-contract-gap-report.json', (json) => json?.status === 'ok', 'status=ok'],
];

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function ageHours(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round(((now.getTime() - date.getTime()) / 36e5) * 100) / 100;
}

const checks = required.map(([id, artifact, isHealthy, expectation]) => {
  const absolute = path.join(root, artifact);
  if (!existsSync(absolute)) {
    return {
      id,
      artifact,
      status: 'blocked',
      reason: 'missing_artifact',
    };
  }

  const json = readJson(artifact);
  const reportedStatus = String(json?.status || 'metric-only');
  const generatedAt = json?.generatedAt || null;
  const age = ageHours(generatedAt);
  const stale = age === null || age > maxAgeHours;
  const accepted = Boolean(isHealthy(json));

  return {
    id,
    artifact,
    reportedStatus,
    generatedAt,
    ageHours: age,
    status: accepted && !stale ? 'ok' : 'blocked',
    reason: !accepted ? 'unexpected_metric' : stale ? 'stale_or_missing_generated_at' : undefined,
    expectation,
  };
});

const blocked = checks.filter((item) => item.status === 'blocked');
const report = {
  generatedAt: now.toISOString(),
  status: blocked.length > 0 ? 'blocked' : 'ready',
  maxAgeHours,
  checks,
  totals: {
    ok: checks.filter((item) => item.status === 'ok').length,
    blocked: blocked.length,
  },
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Release Evidence',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Max Age Hours: ${report.maxAgeHours}`,
    `- OK: ${report.totals.ok}`,
    `- Blocked: ${report.totals.blocked}`,
    `- GitHub Actions: kullanılmadı`,
    '',
    '| Check | Status | Reported Status | Age Hours | Artifact |',
    '|---|---|---|---:|---|',
    ...checks.map(
      (item) =>
        `| ${item.id} | ${item.status}${item.reason ? ` (${item.reason})` : ''} | ${item.reportedStatus || '-'} | ${item.ageHours ?? '-'} | \`${item.artifact}\` |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Release evidence written: ${outJson}`);
console.log(`Release evidence written: ${outMd}`);
if (blocked.length > 0) process.exit(1);
