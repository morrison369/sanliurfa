#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'site-doctor-report.json');
const outMd = path.join(root, 'docs', 'site-doctor-report.md');

const checks = [
  ['release-status', 'docs/release-status.json'],
  ['local-gate-summary', 'docs/local-gate-summary.json'],
  ['critical-pages-policy', 'docs/CRITICAL_PAGES.md'],
  ['image-manifest', 'public/images/image-manifest.json'],
  ['site-content-admin', 'src/pages/admin/site-content.astro'],
  ['db-first-doc', 'docs/DB_FIRST_SITE_MANAGEMENT.md'],
];

const results = checks.map(([id, rel]) => ({
  id,
  artifact: rel,
  status: existsSync(path.join(root, rel)) ? 'ok' : 'missing',
}));

let imageRecords = 0;
try {
  const manifest = JSON.parse(readFileSync(path.join(root, 'public', 'images', 'image-manifest.json'), 'utf8'));
  imageRecords = Array.isArray(manifest) ? manifest.length : 0;
} catch {}

results.push({
  id: 'critical-image-count',
  artifact: 'public/images/image-manifest.json',
  status: imageRecords >= 10 ? 'ok' : 'advisory',
  value: imageRecords,
});

const blocked = results.filter((item) => item.status === 'missing');
const advisory = results.filter((item) => item.status === 'advisory');
const report = {
  generatedAt: new Date().toISOString(),
  status: blocked.length > 0 ? 'blocked' : advisory.length > 0 ? 'ready_with_advisories' : 'ready',
  checks: results,
  totals: {
    ok: results.filter((item) => item.status === 'ok').length,
    advisory: advisory.length,
    blocked: blocked.length,
  },
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Site Doctor Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- OK: ${report.totals.ok}`,
    `- Advisory: ${report.totals.advisory}`,
    `- Blocked: ${report.totals.blocked}`,
    '',
    '| Check | Status | Artifact |',
    '|---|---|---|',
    ...results.map((item) => `| ${item.id} | ${item.status}${item.value !== undefined ? ` (${item.value})` : ''} | \`${item.artifact}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Site doctor written: ${outJson}`);
console.log(`Site doctor written: ${outMd}`);
if (blocked.length > 0) process.exit(1);
