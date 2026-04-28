#!/usr/bin/env npx tsx
/**
 * Codemod: API endpoint string validation anti-pattern fixer
 *
 * Düzeltilen pattern'ler (hem basit identifier hem property access: body.x):
 *   1. x !== undefined && String(x).length > N
 *      → x !== undefined && x !== null && (typeof x !== 'string' || x.length > N)
 *
 *   2. x && String(x).length > N
 *      → x !== undefined && x !== null && (typeof x !== 'string' || x.length > N)
 *
 *   3. String(x).length > N  (standalone — required field)
 *      → typeof x !== 'string' || x.length > N
 *
 *   4. x && x.length > N
 *      → x !== undefined && x !== null && (typeof x !== 'string' || x.length > N)
 *
 *   5. x && !SET.has(x)
 *      → x !== undefined && x !== null && (typeof x !== 'string' || !SET.has(x))
 *
 *   6. x !== undefined && !SET.has(x)
 *      → x !== undefined && x !== null && (typeof x !== 'string' || !SET.has(x))
 *
 * Kullanım:
 *   npx tsx scripts/codemod-validation.ts            # uygula
 *   npx tsx scripts/codemod-validation.ts --dry-run  # önizle
 *   npx tsx scripts/codemod-validation.ts --verbose  # detaylı çıktı
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose');
const root = resolve(process.cwd(), 'src/pages/api');

function walkTs(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walkTs(full));
    else if (e.isFile() && e.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

// Sıra önemli: 1+2 önce 3'ten, 4 önce 3'ten (daha spesifik olanlar önce)
const transforms: Array<{ name: string; run: (s: string) => string }> = [
  // 1. x !== undefined && String(x).length OP N  (identifier veya body.x)
  {
    name: 'undefined-check + String().length',
    run: (s) => s.replace(
      /([\w.]+)\s*!==\s*undefined\s*&&\s*String\(\1\)\.length\s*(>=?|<=?|!==?|===?)\s*(\d+)/g,
      (_, v, op, n) => `${v} !== undefined && ${v} !== null && (typeof ${v} !== 'string' || ${v}.length ${op} ${n})`,
    ),
  },

  // 2. x && String(x).length OP N  (identifier veya body.x)
  {
    name: 'truthy-check + String().length',
    run: (s) => s.replace(
      /([\w.]+)\s*&&\s*String\(\1\)\.length\s*(>=?|<=?|!==?|===?)\s*(\d+)/g,
      (_, v, op, n) => `${v} !== undefined && ${v} !== null && (typeof ${v} !== 'string' || ${v}.length ${op} ${n})`,
    ),
  },

  // 3. String(x).length OP N  (standalone required field; identifier veya body.x)
  {
    name: 'standalone String().length',
    run: (s) => s.replace(
      /String\(([\w.]+)\)\.length\s*(>=?|<=?|!==?|===?)\s*(\d+)/g,
      (_, v, op, n) => `typeof ${v} !== 'string' || ${v}.length ${op} ${n}`,
    ),
  },

  // 4. x && x.length OP N  (identifier veya body.x)
  {
    name: 'truthy-check + bare .length',
    run: (s) => s.replace(
      /([\w.]+)\s*&&\s*\1\.length\s*(>=?|<=?|!==?|===?)\s*(\d+)/g,
      (_, v, op, n) => `${v} !== undefined && ${v} !== null && (typeof ${v} !== 'string' || ${v}.length ${op} ${n})`,
    ),
  },

  // 5. x && !SET.has(x)  (identifier veya body.x)
  {
    name: 'truthy-check + !Set.has() ENUM',
    run: (s) => s.replace(
      /([\w.]+)\s*&&\s*!(\w+)\.has\(\1\)/g,
      (_, v, set) => `${v} !== undefined && ${v} !== null && (typeof ${v} !== 'string' || !${set}.has(${v}))`,
    ),
  },

  // 6. x !== undefined && !SET.has(x)  (identifier veya body.x)
  {
    name: 'undefined-check + !Set.has() ENUM',
    run: (s) => s.replace(
      /([\w.]+)\s*!==\s*undefined\s*&&\s*!(\w+)\.has\(\1\)/g,
      (_, v, set) => `${v} !== undefined && ${v} !== null && (typeof ${v} !== 'string' || !${set}.has(${v}))`,
    ),
  },
];

const files = walkTs(root);
let totalFiles = 0;
let totalChanges = 0;
const changed: Array<{ file: string; changes: string[] }> = [];

for (const filePath of files) {
  const original = readFileSync(filePath, 'utf-8');
  let content = original;
  const appliedHere: string[] = [];

  for (const t of transforms) {
    const before = content;
    content = t.run(content);
    if (content !== before) appliedHere.push(t.name);
  }

  if (content !== original) {
    totalFiles++;
    const origLines = original.split('\n');
    const newLines = content.split('\n');
    let diffCount = 0;
    for (let i = 0; i < Math.max(origLines.length, newLines.length); i++) {
      if (origLines[i] !== newLines[i]) diffCount++;
    }
    totalChanges += diffCount;
    changed.push({ file: relative(process.cwd(), filePath), changes: appliedHere });
    if (!isDryRun) writeFileSync(filePath, content, 'utf-8');
  }
}

if (changed.length === 0) {
  console.log('✅ Düzeltilecek anti-pattern bulunamadı.');
} else {
  console.log(`\n${isDryRun ? '🔍 DRY RUN —' : '✅'} ${totalFiles} dosya, ~${totalChanges} satır değişti:\n`);
  for (const { file, changes } of changed) {
    console.log(`  ${file}`);
    if (isVerbose) for (const c of changes) console.log(`    • ${c}`);
  }
  if (isDryRun) console.log('\n  Uygulamak için: npx tsx scripts/codemod-validation.ts');
}
