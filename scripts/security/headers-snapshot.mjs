#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const middleware = readFileSync(path.join(root, 'src', 'middleware.ts'), 'utf8');
const outJson = path.join(root, 'docs', 'security-headers-snapshot.json');
const outMd = path.join(root, 'docs', 'SECURITY_HEADERS_SNAPSHOT.md');

const required = [
  ['Content-Security-Policy', 'response.headers.set'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Strict-Transport-Security', 'max-age=31536000'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  ['Cross-Origin-Resource-Policy', 'same-origin'],
  ['Cache-Control', 'no-store, no-cache, must-revalidate'],
];

const checks = required.map(([header, expected]) => ({
  header,
  expected,
  status: middleware.includes(header) && middleware.includes(expected) ? 'ok' : 'blocked',
}));

const blocked = checks.filter((item) => item.status === 'blocked');
const report = {
  generatedAt: new Date().toISOString(),
  status: blocked.length > 0 ? 'blocked' : 'ok',
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
    '# Security Headers Snapshot',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- OK: ${report.totals.ok}`,
    `- Blocked: ${report.totals.blocked}`,
    '',
    '| Header | Expected | Status |',
    '|---|---|---|',
    ...checks.map((item) => `| ${item.header} | \`${item.expected}\` | ${item.status} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Security headers snapshot written: ${outJson}`);
console.log(`Security headers snapshot written: ${outMd}`);
if (blocked.length > 0) process.exit(1);
