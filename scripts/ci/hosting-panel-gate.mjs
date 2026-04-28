#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const forbiddenMatchers = [
  /\bplesk\b/i,
  /node\.js toolkit/i,
  /\bhttpdocs\b/i,
  /\bpost-receive\b/i,
];

const allFiles = execSync('rg --files', { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

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
