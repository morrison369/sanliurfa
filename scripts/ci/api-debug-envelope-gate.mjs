#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'api-debug-envelope-report.json');
const outMd = path.join(docsDir, 'api-debug-envelope-report.md');

function read(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

const checks = [
  {
    id: 'problem-json-request-id',
    file: 'src/lib/api.ts',
    ok:
      read('src/lib/api.ts').includes('X-Request-ID') &&
      read('src/lib/api.ts').includes('requestId') &&
      read('src/lib/api.ts').includes('application/problem+json'),
    detail: 'Problem+JSON hata yanıtları requestId ve X-Request-ID taşır.',
  },
  {
    id: 'client-fetch-debug-helper',
    file: 'src/lib/client/api-debug.ts',
    ok:
      read('src/lib/client/api-debug.ts').includes('fetchJson') &&
      read('src/lib/client/api-debug.ts').includes('formatClientApiError') &&
      read('src/lib/client/api-debug.ts').includes('requestId'),
    detail: 'Frontend fetch wrapper endpoint/status/requestId bilgisini tek formatta verir.',
  },
  {
    id: 'admin-operations-debug-endpoint',
    file: 'src/pages/api/admin/operations/summary.ts',
    ok:
      read('src/pages/api/admin/operations/summary.ts').includes('getRequestId') &&
      read('src/pages/api/admin/operations/summary.ts').includes('debug') &&
      read('src/pages/api/admin/operations/summary.ts').includes('X-Request-ID'),
    detail: 'Admin operasyon endpointi debug payload ve requestId header üretir.',
  },
];

const failed = checks.filter((check) => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'ok' : 'failed',
  summary: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
  },
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# API Debug Envelope Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Passed: ${report.summary.passed}/${report.summary.total}`,
    '',
    '| Check | Status | File | Detail |',
    '|---|---|---|---|',
    ...checks.map((check) => `| ${check.id} | ${check.ok ? 'ok' : 'failed'} | \`${check.file}\` | ${check.detail} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`api-debug-envelope-gate: ${report.status.toUpperCase()} (${report.summary.passed}/${report.summary.total})`);
process.exit(report.status === 'ok' ? 0 : 1);
