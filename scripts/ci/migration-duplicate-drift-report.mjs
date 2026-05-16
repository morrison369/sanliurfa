#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const reportPath = path.join(docsDir, 'migration-duplicate-report.json');
const baselinePath = path.join(docsDir, 'migration-duplicate-baseline.json');
const outJson = path.join(docsDir, 'migration-duplicate-drift-report.json');
const outMd = path.join(docsDir, 'migration-duplicate-drift-report.md');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function stable(value) {
  return JSON.stringify(value || {}, Object.keys(value || {}).sort());
}

const duplicateReport = readJsonSafe(reportPath);
const baseline = readJsonSafe(baselinePath);
const numberDuplicates = duplicateReport?.duplicateNumbers || {};
const slugDuplicates = duplicateReport?.duplicateSlugs || {};
const numberBaseline = baseline?.numberDuplicates || {};
const slugBaseline = baseline?.slugDuplicates || {};
const numberDrift = stable(numberDuplicates) !== stable(numberBaseline);
const slugDrift = stable(slugDuplicates) !== stable(slugBaseline);

const report = {
  generatedAt: new Date().toISOString(),
  status: !duplicateReport || !baseline ? 'missing_input' : numberDrift || slugDrift ? 'drift' : 'ok',
  source: {
    report: 'docs/migration-duplicate-report.json',
    baseline: 'docs/migration-duplicate-baseline.json',
  },
  policy: {
    existingDuplicateRenameAllowed: false,
    newDuplicateAllowed: false,
    reason: 'Production schema_migrations history can be broken by renaming old migration files.',
  },
  summary: {
    duplicateNumberGroups: Object.keys(numberDuplicates).length,
    duplicateSlugGroups: Object.keys(slugDuplicates).length,
    numberDrift,
    slugDrift,
  },
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Migration Duplicate Drift Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Duplicate number groups: ${report.summary.duplicateNumberGroups}`,
    `- Duplicate slug groups: ${report.summary.duplicateSlugGroups}`,
    `- Number drift: ${report.summary.numberDrift ? 'yes' : 'no'}`,
    `- Slug drift: ${report.summary.slugDrift ? 'yes' : 'no'}`,
    '',
    'Policy: Eski duplicate migration dosyaları rename edilmez. Yeni duplicate oluşursa drift olarak yakalanır.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `migration-duplicate-drift-report: ${report.status.toUpperCase()} (${report.summary.duplicateNumberGroups} number groups, ${report.summary.duplicateSlugGroups} slug groups)`,
);
process.exit(report.status === 'drift' || report.status === 'missing_input' ? 1 : 0);
