#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function getChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  try {
    if (baseRef) {
      run(`git fetch --depth=1 origin ${baseRef}`);
      return run(`git diff --name-only origin/${baseRef}...HEAD`).split('\n').filter(Boolean);
    }
    if (!isCi) {
      return [];
    }
    return run('git diff --name-only HEAD~1...HEAD').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isLintable(file) {
  if (!file.startsWith('src/')) return false;
  return /\.(ts|tsx|astro)$/.test(file);
}

const changed = getChangedFiles().filter(isLintable);

if (changed.length === 0) {
  console.log('lint:changed -> no lintable files changed');
  process.exit(0);
}

console.log(`lint:changed -> linting ${changed.length} file(s)`);
const quoted = changed.map((f) => `"${f}"`).join(' ');
execSync(`node ./node_modules/eslint/bin/eslint.js ${quoted}`, { stdio: 'inherit' });
