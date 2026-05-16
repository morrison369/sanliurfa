#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'warmup-safety-report.json');
const outMd = path.join(docsDir, 'warmup-safety-report.md');

const warmupFiles = [
  'scripts/cache-warm.mjs',
  'scripts/cache-warmup.sh',
  'scripts/prod-cwp-ops.sh',
];

function readSafe(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

const checks = warmupFiles.map((rel) => {
  const text = readSafe(rel);
  const exists = text.length > 0;
  const startsServer =
    /\b(astro\s+dev|astro\s+preview|npm\s+run\s+dev|npm\s+run\s+preview|Start-Process)\b/i.test(text) &&
    /warm/i.test(rel + text);
  const nullPathRisk = /\b(Path|path)\b[^;\n]*\b(null|undefined)\b/i.test(text);
  return {
    rel,
    exists,
    startsServer,
    nullPathRisk,
    ok: exists && !startsServer && !nullPathRisk,
  };
});

const failed = checks.filter((item) => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'ok' : 'review',
  policy: {
    warmupMayOpenPorts: false,
    warmupMayStartDevServer: false,
    warmupShouldOnlyFetchExistingBaseUrl: true,
  },
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Warmup Safety Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Warmup may open ports: ${report.policy.warmupMayOpenPorts ? 'yes' : 'no'}`,
    `- Warmup may start dev server: ${report.policy.warmupMayStartDevServer ? 'yes' : 'no'}`,
    '',
    '| File | Exists | Starts Server | Null Path Risk | Status |',
    '|---|---|---|---|---|',
    ...checks.map(
      (item) =>
        `| \`${item.rel}\` | ${item.exists ? 'yes' : 'no'} | ${item.startsServer ? 'yes' : 'no'} | ${item.nullPathRisk ? 'yes' : 'no'} | ${item.ok ? 'ok' : 'review'} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`warmup-safety-report: ${report.status.toUpperCase()} (${failed.length} review)`);
