#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'docs', 'migration-duplicate-report.json');
const baselinePath = path.join(root, 'docs', 'migration-duplicate-baseline.json');
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
const baseline = (() => {
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch {
    return { numberDuplicates: {}, slugDuplicates: {} };
  }
})();
const duplicateNumbers = source?.duplicateNumbers || {};
const duplicateSlugs = source?.duplicateSlugs || {};
const numberEntries = Object.entries(duplicateNumbers);
const slugEntries = Object.entries(duplicateSlugs);
const baselineNumbers = baseline.numberDuplicates || {};
const baselineSlugs = baseline.slugDuplicates || {};

function sameFiles(current, expected) {
  return JSON.stringify([...(current || [])].sort()) === JSON.stringify([...(expected || [])].sort());
}

const newDuplicateNumbers = Object.fromEntries(
  numberEntries.filter(([number, files]) => !sameFiles(files, baselineNumbers[number])),
);
const newDuplicateSlugs = Object.fromEntries(
  slugEntries.filter(([slug, files]) => !sameFiles(files, baselineSlugs[slug])),
);
const newNumberEntries = Object.entries(newDuplicateNumbers);
const newSlugEntries = Object.entries(newDuplicateSlugs);
const hasNewDebt = newNumberEntries.length > 0 || newSlugEntries.length > 0;

const report = {
  generatedAt: new Date().toISOString(),
  status: hasNewDebt ? 'advisory' : 'clear',
  source: 'docs/migration-duplicate-report.json',
  baseline: 'docs/migration-duplicate-baseline.json',
  totals: {
    duplicateNumberGroups: numberEntries.length,
    duplicateSlugGroups: slugEntries.length,
    knownDuplicateNumberGroups: numberEntries.length - newNumberEntries.length,
    knownDuplicateSlugGroups: slugEntries.length - newSlugEntries.length,
    newDuplicateNumberGroups: newNumberEntries.length,
    newDuplicateSlugGroups: newSlugEntries.length,
  },
  duplicateNumbers,
  duplicateSlugs,
  newDuplicateNumbers,
  newDuplicateSlugs,
  recommendation:
    hasNewDebt
      ? 'Yeni migration duplicate borcu olustu; dosya ekleme/isimlendirme akisi duzeltilmeli.'
      : 'Tarihi migration duplicate kayitlari baseline ile sinirli. DB gecmisini bozmamak icin dosya rename yapilmadi; yeni duplicate regresyonlari gate tarafindan yakalanir.',
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Migration Duplicate Debt Report',
  '',
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  `- Duplicate Number Groups: ${report.totals.duplicateNumberGroups}`,
  `- Duplicate Slug Groups: ${report.totals.duplicateSlugGroups}`,
  `- Known Duplicate Number Groups: ${report.totals.knownDuplicateNumberGroups}`,
  `- Known Duplicate Slug Groups: ${report.totals.knownDuplicateSlugGroups}`,
  `- New Duplicate Number Groups: ${report.totals.newDuplicateNumberGroups}`,
  `- New Duplicate Slug Groups: ${report.totals.newDuplicateSlugGroups}`,
  '',
  '## New Duplicate Numbers',
  '',
];

if (newNumberEntries.length === 0) {
  lines.push('- Yok');
} else {
  for (const [number, files] of newNumberEntries) {
    lines.push(`- ${number}: ${files.join(', ')}`);
  }
}

lines.push('', '## New Duplicate Slugs', '');

if (newSlugEntries.length === 0) {
  lines.push('- Yok');
} else {
  for (const [slug, files] of newSlugEntries) {
    lines.push(`- ${slug}: ${files.join(', ')}`);
  }
}

lines.push('', '## Known Baseline Duplicate Numbers', '');

if (numberEntries.length === 0) {
  lines.push('- Yok');
} else {
  for (const [number, files] of numberEntries) {
    lines.push(`- ${number}: ${files.join(', ')}`);
  }
}

lines.push('', '## Known Baseline Duplicate Slugs', '');

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
