#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outMd = path.join(root, 'docs', 'RELEASE_STATUS.md');
const outJson = path.join(root, 'docs', 'release-status.json');

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const localGate = readJson('docs/local-gate-summary.json');
const openapi = readJson('docs/openapi-p0-closure-report.json');
const problemJson = readJson('docs/problem-json-report.json');
const imageManifest = readJson('public/images/image-manifest.json');
const envDoctor = readJson('docs/env-doctor-report.json');
const opsLastRun = readJson('docs/ops-last-run.json');
const openapiTiers = readJson('docs/openapi-route-tiers.json');
const authLogStandard = readJson('docs/auth-log-standard-report.json');
const releaseEvidence = readJson('docs/release-evidence.json');

const report = {
  generatedAt: new Date().toISOString(),
  status: localGate?.status || 'unknown',
  advisory: Number(localGate?.totals?.advisory || 0),
  blocked: Number(localGate?.totals?.blocked || 0),
  openapiRoutes: `${Number(openapi?.documentedPaths || 0)}/${Number(openapi?.fileRoutes || 0)}`,
  problemJsonOffenders: Number(problemJson?.offenders || 0),
  imageRecords: Array.isArray(imageManifest) ? imageManifest.length : 0,
  envDoctor: envDoctor?.status || 'missing',
  opsLastRun: opsLastRun?.status || 'not_run',
  openapiTiers: openapiTiers?.status || 'missing',
  openapiTierTotals: openapiTiers?.totals || null,
  authLogStandard: authLogStandard?.status || 'missing',
  releaseEvidence: releaseEvidence?.status || 'missing',
};

writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Release Status',
  '',
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  `- Advisory: ${report.advisory}`,
  `- Blocked: ${report.blocked}`,
  `- OpenAPI Routes: ${report.openapiRoutes}`,
  `- Problem JSON Offenders: ${report.problemJsonOffenders}`,
  `- Image Manifest Records: ${report.imageRecords}`,
  `- Env Doctor: ${report.envDoctor}`,
  `- Ops Last Run: ${report.opsLastRun}`,
  `- OpenAPI Tiers: ${report.openapiTiers}`,
  `- Auth Log Standard: ${report.authLogStandard}`,
  `- Release Evidence: ${report.releaseEvidence}`,
  `- GitHub Actions: not used`,
  '',
  'Summary: Yerel release kanitlari tek dosyada toplandi.',
];
if (existsSync(path.join(root, 'docs', 'local-gate-summary.md'))) {
  lines.push('', 'Kaynak: `docs/local-gate-summary.md`');
}
writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
console.log(`Release status written: ${outJson}`);
console.log(`Release status written: ${outMd}`);
