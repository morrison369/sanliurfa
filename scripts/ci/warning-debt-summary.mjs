#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { relative, sep } from 'path';

const ROOT = process.cwd();
const INPUT = process.argv.includes('--input')
  ? process.argv[process.argv.indexOf('--input') + 1]
  : 'eslint-stylish.log';
const OUTPUT = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : 'docs/warning-debt-summary.json';

if (!existsSync(INPUT)) {
  console.error(`warning debt input log not found: ${INPUT}`);
  process.exit(1);
}

const text = readFileSync(INPUT, 'utf8');
const lines = text.split(/\r?\n/);

const byArea = new Map();
const byRule = new Map();
const byFile = new Map();

let currentFile = null;
const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, '');
for (const raw of lines) {
  const line = stripAnsi(raw).trimEnd();
  if (!line) continue;

  if (/^[A-Za-z]:\\/.test(line) || line.startsWith('/')) {
    currentFile = line.split(':')[0];
    continue;
  }

  const relPathMatch = line.match(/^(src\/[A-Za-z0-9_./-]+\.(?:ts|tsx|astro|js|mjs|cjs)):\d+:\d+/);
  if (relPathMatch) {
    currentFile = `${ROOT}/${relPathMatch[1]}`;
  }

  if (!currentFile || !/\bwarning\b/.test(line)) continue;

  const ruleMatch = line.match(/([@a-zA-Z0-9-_/]+)$/);
  const rule = ruleMatch?.[1] || 'unknown-rule';

  const rel = relative(ROOT, currentFile).split(sep).join('/');
  const area = rel.startsWith('src/components/')
    ? 'src/components'
    : rel.startsWith('src/pages/api/')
      ? 'src/pages/api'
      : rel.startsWith('src/pages/')
        ? 'src/pages'
        : rel.startsWith('src/lib/')
          ? 'src/lib'
          : 'other';

  byArea.set(area, (byArea.get(area) || 0) + 1);
  byRule.set(rule, (byRule.get(rule) || 0) + 1);
  byFile.set(rel, (byFile.get(rel) || 0) + 1);
}

function top(map, limit = 20) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

const summary = {
  generatedAt: new Date().toISOString(),
  sourceLog: INPUT,
  totals: {
    warnings: [...byFile.values()].reduce((a, b) => a + b, 0),
    files: byFile.size,
  },
  byArea: top(byArea, 10),
  topRules: top(byRule, 15),
  topFiles: top(byFile, 25),
};

writeFileSync(OUTPUT, JSON.stringify(summary, null, 2));

console.log('## Warning Debt Summary');
console.log('');
console.log(`- source: ${INPUT}`);
console.log(`- warnings: ${summary.totals.warnings}`);
console.log(`- files: ${summary.totals.files}`);
for (const area of summary.byArea) {
  console.log(`- ${area.key}: ${area.count}`);
}
