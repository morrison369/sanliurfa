#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workspaceRoot = path.resolve(root, '..');
const docsDir = path.join(root, 'docs');
const outputFile = path.join(root, 'scripts/gmaps-discovery-queries.txt');
const reportFile = path.join(docsDir, 'gmaps-discovery-plan-report.json');
const sourceFile = path.join(workspaceRoot, 'kategoriler.txt');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isSection(line) {
  return /^\d+\)\s+/.test(line);
}

function cleanCategory(line) {
  return line.replace(/^\d+\)\s+/, '').replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function readCategories() {
  if (!fs.existsSync(sourceFile)) return [];

  const categories = [];
  let section = '';
  for (const raw of fs.readFileSync(sourceFile, 'utf8').split(/\r?\n/)) {
    const line = cleanCategory(raw);
    if (!line) continue;
    if (isSection(raw.trim())) {
      section = line;
      continue;
    }
    if (line.length < 3) continue;
    categories.push({ section, name: line });
  }

  const seen = new Set();
  return categories.filter((item) => {
    const key = slugify(`${item.section}-${item.name}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const categories = readCategories();
const lines = categories.map((item) => {
  const id = `kategori-${slugify(item.section)}-${slugify(item.name)}`;
  return `${item.name} Şanlıurfa #!#${id}`;
});

const report = {
  generatedAt: new Date().toISOString(),
  status: lines.length > 0 ? 'ok' : 'blocked',
  sourceFile: path.relative(root, sourceFile).replace(/\\/g, '/'),
  outputFile: path.relative(root, outputFile).replace(/\\/g, '/'),
  queryCount: lines.length,
  sectionCount: new Set(categories.map((item) => item.section)).size,
  inputIdFormat: 'category query #!#kategori-section-name',
  policy: {
    discoveryOnly: true,
    doesNotUpdatePlaces: true,
    localStorageOnly: true,
    recommendedConcurrency: 1,
    recommendedDepth: 1,
  },
  sample: lines.slice(0, 10),
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8');
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(
  `gmaps-discovery-plan: ${report.status.toUpperCase()} ` +
    `(queries=${report.queryCount}, sections=${report.sectionCount}, output=${report.outputFile})`,
);

if (report.status !== 'ok') process.exit(1);
