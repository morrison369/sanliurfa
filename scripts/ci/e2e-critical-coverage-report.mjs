#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'e2e-critical-coverage-report.json');
const outMd = path.join(docsDir, 'e2e-critical-coverage-report.md');

const criticalFlows = [
  { key: 'home', specs: ['e2e/homepage.spec.ts', 'e2e/home.spec.ts', 'e2e/smoke.spec.ts'] },
  { key: 'auth', specs: ['e2e/auth.spec.ts', 'e2e/2fa.spec.ts'] },
  { key: 'admin', specs: ['e2e/admin.spec.ts', 'e2e/admin-site-content-live.spec.ts'] },
  { key: 'places', specs: ['e2e/places.spec.ts', 'e2e/tests/places.spec.ts'] },
  { key: 'blog', specs: ['e2e/blog.spec.ts', 'e2e/tests/blog.spec.ts'] },
  { key: 'search', specs: ['e2e/smoke.spec.ts', 'e2e/homepage.spec.ts'] },
  { key: 'reservations', specs: ['e2e/places.spec.ts'] },
  { key: 'payments', specs: ['e2e/payment.spec.ts', 'e2e/stripe-integration.spec.ts', 'e2e/subscription.spec.ts'] },
  { key: 'social', specs: ['e2e/social-features.spec.ts', 'e2e/social-phase1.spec.ts', 'e2e/social/profiles.spec.ts'] },
  { key: 'media', specs: ['e2e/photos.spec.ts'] },
];

function readSafe(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

function countTests(text) {
  return (text.match(/\btest(?:\.skip|\.fixme|\.only)?\s*\(/g) || []).length;
}

function countSkips(text) {
  return (text.match(/\btest\.skip\s*\(/g) || []).length;
}

const flows = criticalFlows.map((flow) => {
  const specs = flow.specs.map((rel) => {
    const text = readSafe(rel);
    return {
      rel,
      exists: text.length > 0,
      testCount: countTests(text),
      skipCount: countSkips(text),
    };
  });
  const existingSpecs = specs.filter((spec) => spec.exists);
  const testCount = existingSpecs.reduce((sum, spec) => sum + spec.testCount, 0);
  const skipCount = existingSpecs.reduce((sum, spec) => sum + spec.skipCount, 0);
  return {
    key: flow.key,
    status: existingSpecs.length > 0 && testCount > skipCount ? 'covered' : 'missing',
    existingSpecCount: existingSpecs.length,
    testCount,
    skipCount,
    specs,
  };
});

const missing = flows.filter((flow) => flow.status !== 'covered');
const report = {
  generatedAt: new Date().toISOString(),
  status: missing.length === 0 ? 'ok' : 'review',
  policy: {
    thisReportRunsBrowsers: false,
    fullCriticalRunCommand: 'node scripts/e2e/nightly-critical-suite.mjs',
  },
  summary: {
    flowCount: flows.length,
    coveredCount: flows.length - missing.length,
    missingCount: missing.length,
  },
  flows,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# E2E Critical Coverage Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Covered: ${report.summary.coveredCount}/${report.summary.flowCount}`,
    `- Browser run command: \`${report.policy.fullCriticalRunCommand}\``,
    '',
    '| Flow | Status | Specs | Tests | Skips |',
    '|---|---|---:|---:|---:|',
    ...flows.map(
      (flow) =>
        `| ${flow.key} | ${flow.status} | ${flow.existingSpecCount} | ${flow.testCount} | ${flow.skipCount} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `e2e-critical-coverage-report: ${report.status.toUpperCase()} (${report.summary.coveredCount}/${report.summary.flowCount} covered)`,
);
process.exit(missing.length > 0 ? 1 : 0);
