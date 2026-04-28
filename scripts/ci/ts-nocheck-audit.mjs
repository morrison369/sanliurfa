#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const allowCleanPatterns = [
  /^src\/pages\/giris\.astro$/,
  /^src\/pages\/kayit\.astro$/,
  /^src\/pages\/messages\.astro$/,
  /^src\/pages\/profile\.astro$/,
  /^src\/pages\/admin\/dashboard\.astro$/,
  /^src\/pages\/admin\/campaigns\.astro$/,
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|astro)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function toRepoPath(abs) {
  return abs.replace(ROOT + '\\', '').replace(/\\/g, '/');
}

function hasNoCheck(text) {
  return /^---\s*\n\s*\/\/\s*@ts-nocheck/m.test(text) || /^\s*\/\/\s*@ts-nocheck/m.test(text);
}

const coreFiles = allowCleanPatterns.map((p) => p.source.replace(/^\^/, '').replace(/\$$/, ''));
const mode = process.argv.includes('--clean-core')
  ? 'clean-core'
  : process.argv.includes('--check-core')
    ? 'check-core'
    : 'audit';
const files = walk(SRC);
const flagged = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (!hasNoCheck(text)) continue;
  flagged.push({ file: toRepoPath(file), size: text.length });
}

if (mode === 'clean-core') {
  let cleaned = 0;
  for (const entry of flagged) {
    if (!allowCleanPatterns.some((r) => r.test(entry.file))) continue;
    const abs = join(ROOT, entry.file);
    const text = readFileSync(abs, 'utf8');
    const next = text
      .replace(/^---\r?\n\s*\/\/\s*@ts-nocheck\r?\n/, '---\n')
      .replace(/^\s*\/\/\s*@ts-nocheck\r?\n/, '');
    if (next !== text) {
      writeFileSync(abs, next);
      cleaned += 1;
    }
  }
  console.log(`ts-nocheck core clean: ${cleaned} file(s)`);
}

if (mode === 'check-core') {
  const coreViolations = flagged
    .filter((entry) => allowCleanPatterns.some((r) => r.test(entry.file)))
    .map((entry) => entry.file);
  if (coreViolations.length > 0) {
    console.error('ts-nocheck core gate failed:');
    for (const file of coreViolations) console.error(`- ${file}`);
    process.exit(1);
  }
  console.log('ts-nocheck core gate: passed');
}

const output = {
  generatedAt: new Date().toISOString(),
  totalFiles: files.length,
  tsNoCheckCount: flagged.length,
  coreFiles,
  files: flagged.map((f) => f.file),
};

writeFileSync('docs/ts-nocheck-audit.json', JSON.stringify(output, null, 2));
console.log(`ts-nocheck audit: ${output.tsNoCheckCount} / ${output.totalFiles}`);
