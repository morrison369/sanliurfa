#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-registry-classification-report.json');
const outMd = path.join(docsDir, 'db-registry-classification-report.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const usage = readJsonSafe('docs/db-usage-audit.json');
const retirement = readJsonSafe('docs/db-retirement-observation-report.json');
const cadence = readJsonSafe('docs/db-observation-cadence-report.json');
const manual = readJsonSafe('docs/db-manual-decision-readiness-report.json');

const summary = usage?.summary || {};
const classification = usage?.classification || {};
const recommendations = [
  {
    priority: 'P1',
    title: 'Unclassified tablo registry kapat',
    status: (classification.unclassifiedCount || 0) > 0 ? 'advisory' : 'ok',
    detail: `${classification.unclassifiedCount || 0} tablo sınıflandırma bekliyor.`,
  },
  {
    priority: 'P1',
    title: 'Reviewable unused index gözlemi destructive olmayan PR ile yönet',
    status: (summary.unusedIndexCount || 0) > 0 ? 'advisory' : 'ok',
    detail: `${summary.unusedIndexCount || 0} reviewable aday var; ${summary.protectedZeroScanIndexCount || 0} unique/constraint protected zero-scan index drop adayı değildir.`,
  },
  {
    priority: 'P1',
    title: '14 günlük production observation penceresini tamamla',
    status: cadence?.summary?.stableEnoughForAction ? 'ok' : 'waiting',
    detail: `${cadence?.summary?.snapshotCount || 0}/${cadence?.policy?.observationDays || 14} snapshot.`,
  },
  {
    priority: 'P2',
    title: 'Manual decision PR için kanıt paketini bekle',
    status: (manual?.summary?.readyForManualPrCount || 0) > 0 ? 'ready' : 'waiting',
    detail: `${manual?.summary?.readyForManualPrCount || 0} ready, ${manual?.summary?.waitingForEvidenceCount || 0} waiting.`,
  },
];

const report = {
  generatedAt: new Date().toISOString(),
  status: 'advisory',
  destructiveActionsAllowed: false,
  automaticDbDropAllowed: false,
  summary: {
    tableCount: summary.tableCount || 0,
    indexCount: summary.indexCount || 0,
    zeroScanIndexCount: summary.zeroScanIndexCount || summary.unusedIndexCount || 0,
    protectedZeroScanIndexCount: summary.protectedZeroScanIndexCount || 0,
    unusedIndexCount: summary.unusedIndexCount || 0,
    unclassifiedCount: classification.unclassifiedCount || 0,
    p0QuarantineCandidateCount: retirement?.summary?.p0QuarantineCandidateCount || 0,
    p0RuntimeHoldCount: retirement?.summary?.p0RuntimeHoldCount || 0,
  },
  classification,
  recommendations,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Registry Classification Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Automatic DB drop allowed: ${report.automaticDbDropAllowed}`,
    `- Tables: ${report.summary.tableCount}`,
    `- Unclassified: ${report.summary.unclassifiedCount}`,
    `- Zero-scan indexes: ${report.summary.zeroScanIndexCount}`,
    `- Protected zero-scan indexes: ${report.summary.protectedZeroScanIndexCount}`,
    `- Reviewable unused index candidates: ${report.summary.unusedIndexCount}`,
    '',
    '| Priority | Recommendation | Status | Detail |',
    '|---|---|---|---|',
    ...recommendations.map((item) => `| ${item.priority} | ${item.title} | ${item.status} | ${item.detail} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-registry-classification-report: ADVISORY (${report.summary.unclassifiedCount} unclassified, ${report.summary.unusedIndexCount} reviewable unused indexes)`,
);
