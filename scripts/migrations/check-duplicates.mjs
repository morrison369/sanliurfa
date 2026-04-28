#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const migrationsDir = path.join(process.cwd(), 'src', 'migrations');
const baselineFile = path.join(process.cwd(), 'docs', 'migration-duplicate-baseline.json');
const reportFile = path.join(process.cwd(), 'docs', 'migration-duplicate-report.json');
const writeBaseline = process.argv.includes('--write-baseline');
if (!fs.existsSync(migrationsDir)) {
  console.error('Migration directory not found:', migrationsDir);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => /\.(ts|js|mjs)$/.test(f))
  .sort();

const byNumber = new Map();
const bySlug = new Map();
for (const file of files) {
  const match = file.match(/^(\d+)_([a-z0-9_-]+)\./i);
  if (!match) continue;
  const [, numberRaw, slug] = match;
  const number = Number(numberRaw);
  if (!byNumber.has(number)) byNumber.set(number, []);
  byNumber.get(number).push(file);
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(file);
}

const duplicateNumbers = [...byNumber.entries()].filter(([, items]) => items.length > 1);
const duplicateSlugs = [...bySlug.entries()].filter(([, items]) => items.length > 1);

const report = {
  generatedAt: new Date().toISOString(),
  totalFiles: files.length,
  parsedFiles: [...byNumber.values()].reduce((acc, items) => acc + items.length, 0),
  duplicateNumbers: Object.fromEntries(
    duplicateNumbers.map(([num, items]) => [String(num), [...items].sort()]),
  ),
  duplicateSlugs: Object.fromEntries(
    duplicateSlugs.map(([slug, items]) => [slug, [...items].sort()]),
  ),
};
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const baseline = fs.existsSync(baselineFile)
  ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
  : { slugDuplicates: {}, numberDuplicates: {} };

const baselineSlug = baseline.slugDuplicates ?? {};
const baselineNum = baseline.numberDuplicates ?? {};

if (writeBaseline) {
  const nextBaseline = {
    generatedAt: new Date().toISOString(),
    slugDuplicates: report.duplicateSlugs,
    numberDuplicates: report.duplicateNumbers,
  };
  fs.mkdirSync(path.dirname(baselineFile), { recursive: true });
  fs.writeFileSync(baselineFile, `${JSON.stringify(nextBaseline, null, 2)}\n`, 'utf8');
  console.log(`Migration duplicate baseline updated: ${baselineFile}`);
  console.log(`Migration duplicate report written: ${reportFile}`);
  process.exit(0);
}

const newNumberDuplicates = duplicateNumbers.filter(([num, items]) => {
  const expected = baselineNum[String(num)] ?? [];
  return JSON.stringify([...items].sort()) !== JSON.stringify([...expected].sort());
});

const newSlugDuplicates = duplicateSlugs.filter(([slug, items]) => {
  const expected = baselineSlug[slug] ?? [];
  return JSON.stringify([...items].sort()) !== JSON.stringify([...expected].sort());
});

if (newNumberDuplicates.length === 0 && newSlugDuplicates.length === 0) {
  console.log(`Migration duplicate report written: ${reportFile}`);
  if (duplicateNumbers.length > 0 || duplicateSlugs.length > 0) {
    console.log('Migration duplicate check: baseline duplicates present, no new regressions.');
  } else {
    console.log('Migration duplicate check: no duplicates found.');
  }
  process.exit(0);
}

if (newNumberDuplicates.length > 0) {
  console.error('New duplicate migration numbers detected:');
  for (const [num, items] of newNumberDuplicates) {
    console.error(` - ${String(num).padStart(3, '0')}: ${items.join(', ')}`);
  }
}

if (newSlugDuplicates.length > 0) {
  console.error('New duplicate migration slugs detected:');
  for (const [slug, items] of newSlugDuplicates) {
    console.error(` - ${slug}: ${items.join(', ')}`);
  }
}

process.exit(1);
