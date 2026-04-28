#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'prod-evidence.json');
const outMd = path.join(root, 'docs', 'PROD_EVIDENCE.md');
const baseUrl = (process.env.PROD_BASE_URL || process.env.SITE_URL || '').replace(/\/$/, '');
const now = new Date();

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

async function probe(pathname) {
  if (!baseUrl) {
    return {
      url: pathname,
      status: 'skipped',
      reason: 'PROD_BASE_URL veya SITE_URL tanımlı değil',
    };
  }

  const url = `${baseUrl}${pathname}`;
  try {
    const started = Date.now();
    const res = await fetch(url, { redirect: 'manual' });
    const elapsedMs = Date.now() - started;
    return {
      url,
      status: res.status >= 200 && res.status < 400 ? 'ok' : 'blocked',
      httpStatus: res.status,
      elapsedMs,
    };
  } catch (error) {
    return {
      url,
      status: 'blocked',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const localEvidence = readJson('docs/release-evidence.json');
const releaseStatus = readJson('docs/release-status.json');
const routeChecks = await Promise.all([
  probe('/'),
  probe('/mekanlar'),
  probe('/admin/system-health'),
  probe('/api/health'),
]);

const blocked = routeChecks.filter((item) => item.status === 'blocked');
const skipped = routeChecks.filter((item) => item.status === 'skipped');
const report = {
  generatedAt: now.toISOString(),
  status: blocked.length > 0 ? 'blocked' : skipped.length > 0 ? 'ready_without_live_probe' : 'ready',
  baseUrl: baseUrl || null,
  localReleaseEvidence: localEvidence?.status || 'missing',
  localReleaseStatus: releaseStatus?.status || 'missing',
  checks: routeChecks,
  totals: {
    ok: routeChecks.filter((item) => item.status === 'ok').length,
    skipped: skipped.length,
    blocked: blocked.length,
  },
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Production Evidence',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl || 'tanımlı değil'}`,
    `- Local Release Evidence: ${report.localReleaseEvidence}`,
    `- Local Release Status: ${report.localReleaseStatus}`,
    `- OK: ${report.totals.ok}`,
    `- Skipped: ${report.totals.skipped}`,
    `- Blocked: ${report.totals.blocked}`,
    `- GitHub Actions: kullanılmadı`,
    '',
    '| Check | Status | HTTP | Elapsed ms | URL/Path |',
    '|---|---|---:|---:|---|',
    ...routeChecks.map(
      (item) =>
        `| route | ${item.status}${item.reason ? ` (${item.reason})` : ''} | ${item.httpStatus ?? '-'} | ${item.elapsedMs ?? '-'} | \`${item.url}\` |`,
    ),
    '',
    'Not: `PROD_BASE_URL` veya `SITE_URL` tanımlı değilse canlı probe atlanır; yerel release kanıtı yine raporlanır.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Production evidence written: ${outJson}`);
console.log(`Production evidence written: ${outMd}`);
if (blocked.length > 0) process.exit(1);
