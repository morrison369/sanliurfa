#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'e2e-report.json');
const outMd = path.join(docsDir, 'e2e-report.md');

const suites = {
  smoke: ['e2e/smoke.spec.ts'],
  critical: [
    'e2e/home.spec.ts',
    'e2e/auth.spec.ts',
    'e2e/places.spec.ts',
    'e2e/blog.spec.ts',
    'e2e/photos.spec.ts',
  ],
  product: [
    'e2e/home.spec.ts',
    'e2e/auth.spec.ts',
    'e2e/places.spec.ts',
    'e2e/blog.spec.ts',
    'e2e/photos.spec.ts',
    'e2e/profile.spec.ts',
    'e2e/loyalty.spec.ts',
    'e2e/recommendations.spec.ts',
  ],
};

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    env: process.env,
    ...options,
  });
}

function extractJson(output) {
  const text = String(output || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function walkSpecs(suitesJson) {
  const specs = [];
  function walkSuite(suite) {
    for (const spec of suite?.specs || []) specs.push(spec);
    for (const child of suite?.suites || []) walkSuite(child);
  }
  for (const suite of suitesJson || []) walkSuite(suite);
  return specs;
}

function summarize(playwrightJson) {
  const specs = walkSpecs(playwrightJson?.suites || []);
  const tests = specs.flatMap((spec) => spec.tests || []);
  const counts = {
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
  };

  for (const test of tests) {
    const outcome = test.outcome || test.status || 'unknown';
    if (outcome === 'expected' || outcome === 'passed') counts.passed += 1;
    else if (outcome === 'skipped') counts.skipped += 1;
    else if (outcome === 'timedOut') counts.timedOut += 1;
    else if (outcome === 'interrupted') counts.interrupted += 1;
    else counts.failed += 1;
  }

  return {
    specCount: specs.length,
    testCount: tests.length,
    ...counts,
  };
}

const suiteName = parseArg('suite', 'critical');
const project = parseArg('project', process.env.E2E_REPORT_PROJECT || 'chromium');
const selectedSpecs = suiteName === 'all' ? [] : suites[suiteName] || suites.critical;
const existingSpecs = selectedSpecs.filter((spec) => fs.existsSync(path.join(root, spec)));
const skipPreflight = process.argv.includes('--skip-preflight') || process.env.E2E_REPORT_SKIP_PREFLIGHT === '1';

if (!skipPreflight) {
  const preflight = run('npm', ['run', '-s', 'test:e2e:preflight'], { stdio: 'inherit' });
  if ((preflight.status ?? 1) !== 0) {
    const report = {
      generatedAt: new Date().toISOString(),
      status: 'failed',
      suite: suiteName,
      project,
      specs: existingSpecs,
      summary: { specCount: existingSpecs.length, testCount: 0, passed: 0, failed: 1, skipped: 0, timedOut: 0, interrupted: 0 },
      failure: 'E2E preflight failed',
    };
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.exit(preflight.status ?? 1);
  }
}

const args = [
  './node_modules/@playwright/test/cli.js',
  'test',
  '--config=playwright.config.ts',
  '--reporter=json',
  ...existingSpecs,
  `--project=${project}`,
];
const result = run('node', args);
const output = `${result.stdout || ''}${result.stderr || ''}`;
const json = extractJson(output);
const summary = summarize(json);
const status = (result.status ?? 1) === 0 && json ? 'passed' : 'failed';
const failedTests = walkSpecs(json?.suites || [])
  .flatMap((spec) => (spec.tests || []).map((test) => ({ spec: spec.title, test })))
  .filter((item) => {
    const outcome = item.test.outcome || item.test.status;
    return outcome && !['expected', 'passed', 'skipped'].includes(outcome);
  })
  .slice(0, 25)
  .map((item) => ({
    spec: item.spec,
    title: item.test.title,
    outcome: item.test.outcome || item.test.status,
  }));

const report = {
  generatedAt: new Date().toISOString(),
  status,
  suite: suiteName,
  project,
  specs: suiteName === 'all' ? ['all'] : existingSpecs,
  exitCode: result.status ?? 1,
  summary,
  failedTests,
  artifactSource: 'Playwright JSON reporter',
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# E2E Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Suite: ${report.suite}`,
    `- Project: ${report.project}`,
    `- Specs: ${report.specs.join(', ')}`,
    `- Tests: ${summary.testCount}`,
    `- Passed/failed/skipped: ${summary.passed}/${summary.failed}/${summary.skipped}`,
    `- Timed out/interrupted: ${summary.timedOut}/${summary.interrupted}`,
    '',
    '## Failed Tests',
    '',
    '| Spec | Test | Outcome |',
    '|---|---|---|',
    ...failedTests.map((item) => `| ${item.spec} | ${item.title} | ${item.outcome} |`),
    '',
  ].join('\n'),
  'utf8',
);

if (!json) {
  console.error('e2e-report: Playwright JSON output could not be parsed');
}
for (const item of failedTests) {
  console.error(`e2e-report failure: ${item.spec} :: ${item.title} (${item.outcome})`);
}
console.log(`e2e-report: ${report.status.toUpperCase()} (${summary.passed}/${summary.testCount} passed)`);
process.exit(status === 'passed' ? 0 : 1);
