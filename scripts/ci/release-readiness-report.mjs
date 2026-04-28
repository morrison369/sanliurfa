#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'release-readiness.json');
const outMd = path.join(root, 'docs', 'release-readiness.md');

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

const checks = [
  { name: 'OpenAPI P0 report', ok: exists('docs/openapi-p0-closure-report.json'), artifact: 'docs/openapi-p0-closure-report.json' },
  { name: 'OpenAPI baseline', ok: exists('docs/openapi-route-gap-baseline.json'), artifact: 'docs/openapi-route-gap-baseline.json' },
  { name: 'Image manifest', ok: exists('public/images/image-manifest.json'), artifact: 'public/images/image-manifest.json' },
  { name: 'DB-first doc', ok: exists('docs/DB_FIRST_SITE_MANAGEMENT.md'), artifact: 'docs/DB_FIRST_SITE_MANAGEMENT.md' },
  { name: 'Detail plan doc', ok: exists('docs/DETAYLI_PROJE_ONERILERI_VE_UYGULAMA_PLANI.md'), artifact: 'docs/DETAYLI_PROJE_ONERILERI_VE_UYGULAMA_PLANI.md' },
];

const openapiP0 = readJsonSafe('docs/openapi-p0-closure-report.json');
const openapiMissing = Number(openapiP0?.totalMissing || 0);

const failed = checks.filter((c) => !c.ok);
const status =
  failed.length > 0 ? 'blocked' : openapiMissing === 0 ? 'ready' : 'ready_with_advisories';

const report = {
  generatedAt: new Date().toISOString(),
  status,
  checks,
  openapi: {
    p0TotalMissing: openapiMissing,
  },
  summary:
    failed.length > 0
      ? `Eksik artefakt sayısı: ${failed.length}`
      : openapiMissing === 0
        ? 'Tüm temel artefaktlar mevcut ve OpenAPI P0 gap kapalı.'
        : 'Temel artefaktlar mevcut. OpenAPI P0 missing sayısı advisory olarak takip edilmeli.',
};

fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

const lines = [];
lines.push('# Release Readiness');
lines.push('');
lines.push(`- Generated At: ${report.generatedAt}`);
lines.push(`- Status: ${report.status}`);
lines.push(`- OpenAPI P0 Total Missing: ${report.openapi.p0TotalMissing}`);
lines.push('');
lines.push('## Checks');
lines.push('');
lines.push('| Check | Status | Artifact |');
lines.push('|---|---|---|');
for (const c of checks) {
  lines.push(`| ${c.name} | ${c.ok ? 'ok' : 'missing'} | \`${c.artifact}\` |`);
}
lines.push('');
lines.push(`Summary: ${report.summary}`);

fs.writeFileSync(outMd, lines.join('\n'), 'utf8');

console.log(`Release readiness written: ${outJson}`);
console.log(`Release readiness written: ${outMd}`);
