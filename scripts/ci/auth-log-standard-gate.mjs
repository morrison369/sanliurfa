#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'auth-log-standard-report.json');
const outMd = path.join(root, 'docs', 'auth-log-standard-report.md');

const checks = [
  {
    id: 'login-invalid-credentials-warn',
    file: 'src/pages/api/auth/login.ts',
    ok(content) {
      return content.includes("logger.warn('Login rejected: invalid credentials')");
    },
    detail: 'Beklenen kullanıcı hatası olan yanlış e-posta/şifre warn seviyesinde loglanmalı.',
  },
  {
    id: 'login-unexpected-error',
    file: 'src/pages/api/auth/login.ts',
    ok(content) {
      return content.includes("logger.error('Login error:'") || content.includes('logger.error("Login error:"');
    },
    detail: 'Beklenmeyen login hataları error seviyesinde kalmalı.',
  },
  {
    id: 'auth-flow-enumeration-safe-message',
    file: 'src/lib/auth/auth-flows.ts',
    ok(content) {
      return (content.match(/E-posta veya şifre hatalı\./g) || []).length >= 3;
    },
    detail: 'Kullanıcı yok, askıda/silinmiş kullanıcı ve yanlış şifre aynı mesajı döndürmeli.',
  },
  {
    id: 'auth-flow-redis-warning-once',
    file: 'src/lib/auth/auth-flows.ts',
    ok(content) {
      return content.includes('Auth session cache write failed, continuing without Redis session (logging once)');
    },
    detail: 'Redis session cache sorunu spam üretmeden warn seviyesinde olmalı.',
  },
];

const results = checks.map((check) => {
  const filePath = path.join(root, check.file);
  const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  return {
    id: check.id,
    file: check.file,
    status: existsSync(filePath) && check.ok(content) ? 'ok' : 'blocked',
    detail: check.detail,
  };
});

const blocked = results.filter((item) => item.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: blocked.length > 0 ? 'blocked' : 'ok',
  checks: results,
  totals: {
    ok: results.length - blocked.length,
    blocked: blocked.length,
  },
};

writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Auth Log Standard Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- OK: ${report.totals.ok}`,
    `- Blocked: ${report.totals.blocked}`,
    '',
    '| Check | Status | File |',
    '|---|---|---|',
    ...results.map((item) => `| ${item.id} | ${item.status} | \`${item.file}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Auth log standard written: ${outJson}`);
console.log(`Auth log standard written: ${outMd}`);
if (blocked.length > 0) {
  for (const item of blocked) console.error(`Auth log standard failed: ${item.id}`);
  process.exit(1);
}
