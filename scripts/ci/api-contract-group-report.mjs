#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'api-contract-group-report.json');
const outMd = path.join(docsDir, 'api-contract-group-report.md');

const groups = {
  auth: [
    'src/lib/__tests__/auth.test.ts',
    'src/lib/__tests__/auth-middleware-helpers.test.ts',
    'src/lib/__tests__/auth-legacy-callback-api.test.ts',
    'src/lib/__tests__/auth-social-facebook-api.test.ts',
    'src/lib/__tests__/two-factor-auth-totp.test.ts',
    'src/lib/__tests__/integration/auth.integration.test.ts',
  ],
  places: [
    'src/lib/__tests__/places.test.ts',
    'src/lib/__tests__/places-detail-api.test.ts',
    'src/lib/__tests__/places-list-cache-api.test.ts',
    'src/lib/__tests__/places-like-api.test.ts',
    'src/lib/__tests__/places-follow-api.test.ts',
    'src/lib/__tests__/places-photos-api.test.ts',
    'src/lib/__tests__/places-analytics-api.test.ts',
    'src/lib/__tests__/places-review-analytics-api.test.ts',
    'src/lib/__tests__/places-availability-api.test.ts',
  ],
  reviews: [
    'src/lib/__tests__/reviews-add-api.test.ts',
    'src/lib/__tests__/review-management-pure.test.ts',
    'src/lib/__tests__/review-antispam.test.ts',
  ],
  admin: [
    'src/lib/__tests__/admin-bulk-action-api.test.ts',
    'src/lib/__tests__/admin-event-submissions-api.test.ts',
    'src/lib/__tests__/admin-moderation-api.test.ts',
    'src/lib/__tests__/admin-users-id-api.test.ts',
  ],
  media: [
    'src/lib/__tests__/files-upload-api.test.ts',
    'src/lib/__tests__/photos-upload-api.test.ts',
    'src/lib/__tests__/public-upload-serving.test.ts',
    'src/lib/__tests__/image-optimizer.test.ts',
    'src/lib/__tests__/security-file-upload-xss.test.ts',
  ],
  search: [
    'src/lib/__tests__/search-engine-fallback.test.ts',
    'src/lib/__tests__/search-index-api.test.ts',
    'src/lib/__tests__/search-normalization.test.ts',
    'src/lib/__tests__/search-zero-result-report-helpers.test.ts',
  ],
  reservations: [
    'src/lib/__tests__/reservations-api.test.ts',
    'src/lib/__tests__/security-vendor-idor.test.ts',
  ],
  promotions: [
    'src/lib/__tests__/places-promotions-api.test.ts',
    'src/lib/__tests__/promotions-api.test.ts',
    'src/lib/__tests__/promotions-management-pure.test.ts',
  ],
  events: [
    'src/lib/__tests__/admin-event-submissions-api.test.ts',
    'src/lib/__tests__/admin-events-admin-pure.test.ts',
    'src/lib/__tests__/events-management-pure.test.ts',
    'src/lib/__tests__/event-stream-types.test.ts',
    'src/lib/__tests__/place-lifecycle-events.test.ts',
    'src/lib/__tests__/place-lifecycle-events-helpers.test.ts',
  ],
  communityPhotos: [
    'src/lib/__tests__/photos-upload-api.test.ts',
    'src/lib/__tests__/places-photos-api.test.ts',
    'src/lib/__tests__/public-upload-serving.test.ts',
  ],
  sitemap: [
    'src/lib/__tests__/sitemap-helpers.test.ts',
  ],
};

const coverageGaps = [];

function parseArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function stripAnsi(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function parseSummary(output) {
  const clean = stripAnsi(output);
  const fileLine = clean.match(/Test Files\s+(.+)/);
  const testLine = clean.match(/Tests\s+(.+)/);
  const parseCount = (line, label) => Number((line?.match(new RegExp(`(\\d+)\\s+${label}`)) || [])[1] || 0);
  return {
    testFilesPassed: parseCount(fileLine?.[1], 'passed'),
    testFilesFailed: parseCount(fileLine?.[1], 'failed'),
    testsPassed: parseCount(testLine?.[1], 'passed'),
    testsFailed: parseCount(testLine?.[1], 'failed'),
  };
}

const selected =
  (parseArg('group') || process.env.API_CONTRACT_GROUP || 'all')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const groupNames = selected.includes('all') ? Object.keys(groups) : selected;
const results = [];

for (const groupName of groupNames) {
  const files = groups[groupName];
  if (!files) {
    results.push({ group: groupName, status: 'unknown-group', files: [], exitCode: 1 });
    continue;
  }

  const existingFiles = files.filter((file) => fs.existsSync(path.join(root, file)));
  const result = spawnSync('node', ['./node_modules/vitest/vitest.mjs', 'run', ...existingFiles], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    shell: true,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  process.stdout.write(output);
  results.push({
    group: groupName,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
    files: existingFiles,
    ...parseSummary(output),
  });
}

const failed = results.filter((item) => item.status !== 'passed');
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'passed' : 'failed',
  groups: results,
  coverageGaps,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# API Contract Group Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Coverage gaps: ${coverageGaps.length}`,
    '',
    '| Group | Status | Files | Tests Passed | Tests Failed |',
    '|---|---|---:|---:|---:|',
    ...results.map((item) => `| ${item.group} | ${item.status} | ${item.files.length} | ${item.testsPassed || 0} | ${item.testsFailed || 0} |`),
    '',
    '## Coverage Gaps',
    '',
    '| Group | Status | Detail |',
    '|---|---|---|',
    ...coverageGaps.map((item) => `| ${item.group} | ${item.status} | ${item.detail} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`api-contract-group-report: ${report.status.toUpperCase()} (${results.length} group)`);
process.exit(failed.length === 0 ? 0 : 1);
