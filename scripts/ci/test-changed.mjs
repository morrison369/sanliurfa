#!/usr/bin/env node
/**
 * test:changed — runs vitest only on test files related to changed src files
 *
 * Husky pre-commit context: staged dosyalara odaklan (working tree noise'ı yok).
 * CI context (GITHUB_BASE_REF set): PR diff'i.
 * Hiç test gerekmiyorsa exit 0 — commit'i bloklamaz.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function normalize(p) {
  return p.replace(/\\/g, '/');
}

function getChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  try {
    if (baseRef) {
      runGit(['fetch', '--depth=1', 'origin', baseRef]);
      return runGit(['diff', '--name-only', `origin/${baseRef}...HEAD`]).split('\n').map(normalize).filter(Boolean);
    }
    return runGit(['diff', '--name-only', '--cached']).split('\n').map(normalize).filter(Boolean);
  } catch {
    return [];
  }
}

function isSrcFile(file) {
  if (!file.startsWith('src/')) return false;
  if (file.includes('__tests__')) return false;
  if (file.endsWith('.d.ts')) return false;
  return /\.(ts|tsx)$/.test(file);
}

function isVitestTestFile(file) {
  if (!file.startsWith('src/')) return false;
  return /\.(test|spec)\.(ts|tsx)$/.test(file);
}

function candidateTestsForSrc(srcFile) {
  const base = path.basename(srcFile).replace(/\.(ts|tsx)$/, '');
  const dir = normalize(path.dirname(srcFile));
  const candidates = [
    `src/lib/__tests__/${base}.test.ts`,
    `src/lib/__tests__/${base}.test.tsx`,
    `${dir}/__tests__/${base}.test.ts`,
    `${dir}/__tests__/${base}.test.tsx`,
    `${dir}/${base}.test.ts`,
    `${dir}/${base}.test.tsx`,
  ];
  return candidates.filter((p) => existsSync(p));
}

const changed = getChangedFiles();
if (changed.length === 0) {
  console.log('test:changed -> no staged files');
  process.exit(0);
}

const tests = new Set();
for (const file of changed) {
  if (isVitestTestFile(file)) {
    tests.add(file);
  } else if (isSrcFile(file)) {
    for (const t of candidateTestsForSrc(file)) tests.add(t);
  }
}

if (tests.size === 0) {
  console.log(`test:changed -> ${changed.length} file(s) staged, no related vitest tests found`);
  process.exit(0);
}

const testList = Array.from(tests);
console.log(`test:changed -> running ${testList.length} test file(s)`);
execFileSync('node', ['./node_modules/vitest/vitest.mjs', 'run', ...testList], { stdio: 'inherit' });
