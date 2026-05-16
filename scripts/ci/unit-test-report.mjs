#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'unit-test-report.json');
const outMd = path.join(docsDir, 'unit-test-report.md');

function stripAnsi(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function parseVitestSummary(output, status) {
  const clean = stripAnsi(output);
  const fileLine = clean.match(/Test Files\s+(.+)/);
  const testLine = clean.match(/Tests\s+(.+)/);
  const parseCount = (line, label) => Number((line?.match(new RegExp(`(\\d+)\\s+${label}`)) || [])[1] || 0);

  return {
    status: status === 0 ? 'passed' : 'failed',
    testFiles: {
      passed: parseCount(fileLine?.[1], 'passed'),
      failed: parseCount(fileLine?.[1], 'failed'),
      skipped: parseCount(fileLine?.[1], 'skipped'),
      total: Number((fileLine?.[1]?.match(/\((\d+)\)/) || [])[1] || 0),
    },
    tests: {
      passed: parseCount(testLine?.[1], 'passed'),
      failed: parseCount(testLine?.[1], 'failed'),
      skipped: parseCount(testLine?.[1], 'skipped'),
      total: Number((testLine?.[1]?.match(/\((\d+)\)/) || [])[1] || 0),
    },
  };
}

const result = spawnSync('node', ['./node_modules/vitest/vitest.mjs', 'run'], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
  shell: true,
});

const output = `${result.stdout || ''}${result.stderr || ''}`;
process.stdout.write(output);

const summary = parseVitestSummary(output, result.status ?? 1);
const report = {
  generatedAt: new Date().toISOString(),
  command: 'node ./node_modules/vitest/vitest.mjs run',
  ...summary,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Unit Test Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Test files: ${report.testFiles.passed} passed / ${report.testFiles.failed} failed / ${report.testFiles.skipped} skipped / ${report.testFiles.total} total`,
    `- Tests: ${report.tests.passed} passed / ${report.tests.failed} failed / ${report.tests.skipped} skipped / ${report.tests.total} total`,
    '',
  ].join('\n'),
  'utf8',
);

process.exit(result.status ?? 1);
