#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'api-release-gate-report.json');
const outMd = path.join(docsDir, 'api-release-gate-report.md');

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const apiContracts = readJsonSafe('docs/api-contract-group-report.json');
const openapiP0 = readJsonSafe('docs/openapi-p0-closure-report.json');
const problemJson = readJsonSafe('docs/problem-json-report.json');
const openapiBaseline = readJsonSafe('docs/openapi-route-gap-baseline.json');

const checks = [
  {
    name: 'api contract groups',
    ok: apiContracts?.status === 'passed',
    artifact: 'docs/api-contract-group-report.json',
    detail: `${apiContracts?.groups?.length ?? 0} groups`,
  },
  {
    name: 'openapi p0 closure',
    ok: Number(openapiP0?.totalMissing || 0) === 0,
    artifact: 'docs/openapi-p0-closure-report.json',
    detail: `${Number(openapiP0?.totalMissing || 0)} missing`,
  },
  {
    name: 'problem json strict',
    ok:
      problemJson?.status === 'passed' ||
      problemJson?.status === 'ok' ||
      problemJson?.offendersCount === 0,
    artifact: 'docs/problem-json-report.json',
    detail: problemJson?.status || `${problemJson?.offendersCount ?? '?'} offenders`,
  },
  {
    name: 'openapi baseline present',
    ok: Boolean(openapiBaseline),
    artifact: 'docs/openapi-route-gap-baseline.json',
    detail: `${Array.isArray(openapiBaseline?.missingInSpec) ? openapiBaseline.missingInSpec.length : 0} baseline gaps`,
  },
  {
    name: 'sdk generated client',
    ok: exists('sdk/generated/client.ts') && exists('sdk/generated/openapi-summary.json'),
    artifact: 'sdk/generated/client.ts',
    detail: exists('sdk/generated/client.ts') ? 'present' : 'missing',
  },
];

const failed = checks.filter((check) => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'passed' : 'failed',
  summary: {
    totalChecks: checks.length,
    passedChecks: checks.length - failed.length,
    failedChecks: failed.length,
  },
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# API Release Gate Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Passed checks: ${report.summary.passedChecks}/${report.summary.totalChecks}`,
    '',
    '| Check | Status | Detail | Artifact |',
    '|---|---|---|---|',
    ...checks.map((check) => `| ${check.name} | ${check.ok ? 'ok' : 'failed'} | ${check.detail} | \`${check.artifact}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`api-release-gate-report: ${report.status.toUpperCase()} (${failed.length} failed)`);
process.exit(failed.length === 0 ? 0 : 1);
