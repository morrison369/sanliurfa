#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

const fileExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.astro']);
const offenders = [];

const importRegexes = [
  /from\s+['"][^'"]*\/lib\/social\/friendship['"]/g,
  /from\s+['"]@\/lib\/social\/friendship['"]/g,
  /from\s+['"][^'"]*\/lib\/social\/messaging['"]/g,
  /from\s+['"]@\/lib\/social\/messaging['"]/g,
];

function isIgnored(filePath) {
  const norm = filePath.replaceAll('\\', '/');
  if (norm.includes('/__tests__/')) return true;
  if (norm.endsWith('.test.ts') || norm.endsWith('.spec.ts')) return true;
  if (norm.endsWith('/src/lib/social/friendship.ts')) return true;
  if (norm.endsWith('/src/lib/social/messaging.ts')) return true;
  return false;
}

function scanFile(filePath) {
  if (isIgnored(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (importRegexes.some((re) => re.test(line))) {
      offenders.push(`${path.relative(root, filePath)}:${i + 1}`);
    }
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!fileExt.has(path.extname(entry.name))) continue;
    scanFile(full);
  }
}

if (!fs.existsSync(srcDir)) {
  console.error('[social-db-first-import-gate] src directory not found');
  process.exit(1);
}

walk(srcDir);

if (offenders.length > 0) {
  console.error('[social-db-first-import-gate] DB-first ihlali: in-memory social import tespit edildi');
  for (const item of offenders) console.error(` - ${item}`);
  process.exit(1);
}

console.log('[social-db-first-import-gate] ok');

