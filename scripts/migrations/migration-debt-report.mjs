#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'docs', 'migration-duplicate-report.json');
const outJson = path.join(root, 'docs', 'migration-debt-report.json');
const outMd = path.join(root, 'docs', 'migration-debt-report.md');

function readSource() {
  try {
    return JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } catch {
    return null;
  }
}

const source = readSource();
const duplicateNumbers = source?.duplicateNumbers || {};
const duplicateSlugs = source?.duplicateSlugs || {};
const numberEntries = Object.entries(duplicateNumbers);
const slugEntries = Object.entries(duplicateSlugs);

const report = {
  generatedAt: new Date().toISOString(),
  status: numberEntries.length === 0 && slugEntries.length === 0 ? 'clear' : 'advisory',
  source: 'docs/migration-duplicate-report.json',
  totals: {
    duplicateNumberGroups: numberEntries.length,
    duplicateSlugGroups: slugEntries.length,
  },
  duplicateNumbers,
  duplicateSlugs,
  recommendation:
    'Bu borc release blocker degil; mevcut gate yeni regresyon olmadigini dogruluyor. Duzeltme DB gecmisiyle iliskili oldugu icin ayri planli migration-normalization isi olarak ele alinmali.',
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Migration Duplicate Debt Report',
  '',
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  `- Duplicate Number Groups: ${report.totals.duplicateNumberGroups}`,
  `- Duplicate Slug Groups: ${report.totals.duplicateSlugGroups}`,
  '',
  '## Duplicate Numbers',
  '',
];

if (numberEntries.length === 0) {
  lines.push('- Yok');
} else {
  for (const [number, files] of numberEntries) {
    lines.push(`- ${number}: ${files.join(', ')}`);
  }
}

lines.push('', '## Duplicate Slugs', '');

if (slugEntries.length === 0) {
  lines.push('- Yok');
} else {
  for (const [slug, files] of slugEntries) {
    lines.push(`- ${slug}: ${files.join(', ')}`);
  }
}

lines.push('', '## Recommendation', '', report.recommendation);

fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');

console.log(`Migration debt report written: ${outJson}`);
console.log(`Migration debt report written: ${outMd}`);
