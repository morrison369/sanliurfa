#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src', 'scripts'];
const EXT_ALLOW = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.astro']);
const pattern = /import\.meta\.env\s*\[/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.project-runtime') continue;
      walk(full, out);
      continue;
    }
    if (!EXT_ALLOW.has(extname(full))) continue;
    out.push(full);
  }
  return out;
}

const violations = [];
for (const t of TARGETS) {
  const base = join(ROOT, t);
  let files = [];
  try {
    files = walk(base);
  } catch {
    continue;
  }
  for (const f of files) {
    const txt = readFileSync(f, 'utf8');
    if (pattern.test(txt)) violations.push(f.replace(`${ROOT}\\`, ''));
  }
}

if (violations.length) {
  console.error('[env-gate] Dynamic import.meta.env access is forbidden. Use static keys.');
  for (const f of violations) console.error(` - ${f}`);
  process.exit(1);
}

console.log('[env-gate] ok: no dynamic import.meta.env access');
