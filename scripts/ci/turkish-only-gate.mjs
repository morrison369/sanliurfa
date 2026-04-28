#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const offenders = [];
const scanRoots = ['src/pages', 'src/components', 'src/layouts'].map((item) => path.join(root, item));
const forbidden = [
  { id: 'language-prefix-en', regex: /['"`]\/en(?:\/|['"`?#])/ },
  { id: 'language-prefix-tr', regex: /['"`]\/tr(?:\/|['"`?#])/ },
  { id: 'hreflang', regex: /\bhreflang\b/i },
  { id: 'accept-language-redirect', regex: /accept-language/i },
  { id: 'language-switcher', regex: /language\s*switcher|dil\s*se[cç]ici/i },
];

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  for (const rule of forbidden) {
    if (rule.regex.test(content)) {
      offenders.push(`${path.relative(root, filePath).replaceAll('\\', '/')}:${rule.id}`);
    }
  }
}

function walk(entry) {
  if (!existsSync(entry)) return;
  const stat = statSync(entry);
  if (stat.isDirectory()) {
    for (const child of readdirSync(entry)) walk(path.join(entry, child));
    return;
  }
  if (/\.(astro|tsx|ts|jsx|js)$/.test(entry)) scanFile(entry);
}

for (const scanRoot of scanRoots) walk(scanRoot);

if (offenders.length > 0) {
  console.error('Turkish-only gate failed:');
  for (const offender of offenders) console.error(` - ${offender}`);
  process.exit(1);
}

console.log('[turkish-only-gate] ok');
