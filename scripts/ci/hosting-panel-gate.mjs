#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const forbiddenMatchers = [
  /\bplesk\b/i,
  /node\.js toolkit/i,
  /\bhttpdocs\b/i,
  /\bpost-receive\b/i,
];

function walkFiles(dir, root = dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') {
        continue;
      }
      files.push(...walkFiles(fullPath, root));
      continue;
    }
    files.push(relative(root, fullPath).replace(/\\/g, '/'));
  }
  return files;
}

const allFiles = walkFiles(process.cwd());

const files = allFiles.filter((file) => {
  if (file === 'AGENTS.md') return true;
  if (file === 'SHARED-HOSTING-DEPLOY.md') return true;
  if (/^DEPLOYMENT.*\.md$/i.test(file)) return true;
  if (/^CWP-.*\.md$/i.test(file)) return true;
  if (/^docs\/.*\.md$/i.test(file)) return true;
  if (/^scripts\/.*\.sh$/i.test(file)) return true;
  return false;
});

const violations = [];
for (const relativePath of files) {
  const content = readFileSync(relativePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const matcher of forbiddenMatchers) {
      if (matcher.test(line)) {
        violations.push(`${relativePath}:${idx + 1} -> ${line.trim()}`);
        break;
      }
    }
  });
}

if (violations.length > 0) {
  console.error('[hosting:panel:gate] Hata: CWP-only politikasıyla çelişen ifade bulundu.');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(`[hosting:panel:gate] OK (${files.length} dosya tarandı)`);
