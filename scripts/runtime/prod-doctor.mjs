#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'runtime-prod-doctor.json');
const outMd = path.join(root, 'docs', 'RUNTIME_PROD_DOCTOR.md');

function loadEnvFile(name) {
  const envPath = path.join(root, name);
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const redisUrl = String(process.env.REDIS_URL || '').trim();
const sessionTtl = Number(process.env.SESSION_TTL || process.env.SESSION_TIMEOUT || 86400);
const checks = [
  {
    id: 'REDIS_URL',
    status: redisUrl ? 'configured' : 'advisory',
    detail: redisUrl ? 'configured_without_secret_output' : 'production Redis URL tanımlı değil',
  },
  {
    id: 'REDIS_GLOBAL_PORT',
    status: redisUrl.includes(':6379') ? 'advisory' : 'ok',
    detail: redisUrl.includes(':6379') ? 'global port kullanımı prod ortamda açıkça doğrulanmalı' : 'project/global port çakışması görünmüyor',
  },
  {
    id: 'SESSION_TTL',
    status: Number.isFinite(sessionTtl) && sessionTtl >= 3600 ? 'ok' : 'advisory',
    detail: `ttl=${Number.isFinite(sessionTtl) ? sessionTtl : 'invalid'}`,
  },
  {
    id: 'NODE_ENV',
    status: process.env.NODE_ENV === 'production' ? 'ok' : 'advisory',
    detail: process.env.NODE_ENV || 'tanımlı değil',
  },
];

const advisories = checks.filter((item) => item.status === 'advisory');
const report = {
  generatedAt: new Date().toISOString(),
  status: advisories.length > 0 ? 'ready_with_advisories' : 'ready',
  checks,
  totals: {
    ok: checks.filter((item) => item.status === 'ok').length,
    advisory: advisories.length,
  },
  note: 'Secret değerleri yazılmaz; sadece yapılandırma durumu raporlanır.',
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Runtime Production Doctor',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- OK: ${report.totals.ok}`,
    `- Advisory: ${report.totals.advisory}`,
    '',
    '| Check | Status | Detail |',
    '|---|---|---|',
    ...checks.map((item) => `| ${item.id} | ${item.status} | ${item.detail} |`),
    '',
    report.note,
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Runtime prod doctor written: ${outJson}`);
console.log(`Runtime prod doctor written: ${outMd}`);
