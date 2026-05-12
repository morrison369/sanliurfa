#!/usr/bin/env node
/**
 * Codemod: Math.min/Math.max + parseInt(searchParams) → safeIntParam
 *
 * Bu script, Bug #38 (NaN bind value) class'ını topluca tedavi eder.
 *
 * Patterns matched (her biri için import hint kontrol edilir):
 *  1) Math.min(MAX, parseInt(url.searchParams.get('K') || 'D'))
 *     → safeIntParam(url.searchParams.get('K'), D, 1, MAX)
 *  2) Math.max(1, parseInt(url.searchParams.get('K') || 'D'))
 *     → safeIntParam(url.searchParams.get('K'), D, 1, 1_000_000)
 *  3) Math.max(1, Math.min(MAX, parseInt(url.searchParams.get('K') || 'D') || D))
 *     → safeIntParam(url.searchParams.get('K'), D, 1, MAX)
 *  4) Çıplak parseInt(url.searchParams.get('K') || 'D')  // ofset/page için
 *     → safeIntParam(url.searchParams.get('K'), D, 0, 1_000_000)
 *
 * Usage:
 *   node scripts/codemod-safe-int-param.mjs            # dry run
 *   node scripts/codemod-safe-int-param.mjs --apply    # write changes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'src', 'pages', 'api');
const APPLY = process.argv.includes('--apply');

// Skip already-migrated files (analytics/performance has its own NaN-guard pattern)
const SKIP = new Set([
  // Already uses safeIntParam or has bespoke NaN guard
]);

const stats = { scanned: 0, modified: 0, replacements: 0 };

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function relativeApiImport(filePath) {
  const dir = path.dirname(filePath);
  const apiPath = path.resolve(__dirname, '..', 'src', 'lib', 'api');
  let rel = path.relative(dir, apiPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function transform(source, filePath) {
  let modified = false;
  let replacementCount = 0;
  const seenKeys = new Set();

  // We'll detect both `url.searchParams.get('X')` and `searchParams.get('X')`
  const SP = String.raw`(?:url\.|context\.url\.)?searchParams\.get\(\s*(['"][^'"]+['"])\s*\)`;
  const NUM = String.raw`(\d[\d_]*)`;

  // Pattern A: Math.max(1, Math.min(MAX, parseInt(SP || 'D') || D))  — export/audit-logs.ts style
  // Be liberal about whitespace
  const reA = new RegExp(
    String.raw`Math\.max\(\s*1\s*,\s*Math\.min\(\s*${NUM}\s*,\s*(?:Number\.)?parseInt\(\s*${SP}\s*\|\|\s*['"](\d+)['"]\s*(?:,\s*10\s*)?\)\s*\|\|\s*\d+\s*\)\s*\)`,
    'g'
  );
  source = source.replace(reA, (_m, max, key, def) => {
    seenKeys.add(key);
    replacementCount++;
    modified = true;
    const cleanMax = max.replace(/_/g, '');
    return `safeIntParam(${spExpr(_m, key)}, ${def}, 1, ${formatNum(cleanMax)})`;
  });

  // Pattern B: Math.min(MAX, Math.max(1, parseInt(SP || 'D')))  (some files invert)
  const reB = new RegExp(
    String.raw`Math\.min\(\s*${NUM}\s*,\s*Math\.max\(\s*1\s*,\s*(?:Number\.)?parseInt\(\s*${SP}\s*\|\|\s*['"](\d+)['"]\s*(?:,\s*10\s*)?\)\s*\)\s*\)`,
    'g'
  );
  source = source.replace(reB, (_m, max, key, def) => {
    seenKeys.add(key);
    replacementCount++;
    modified = true;
    return `safeIntParam(${spExpr(_m, key)}, ${def}, 1, ${formatNum(max)})`;
  });

  // Pattern C: Math.min(MAX, parseInt(SP || 'D'))   (limit pattern, no max guard)
  const reC = new RegExp(
    String.raw`Math\.min\(\s*${NUM}\s*,\s*(?:Number\.)?parseInt\(\s*${SP}\s*\|\|\s*['"](\d+)['"]\s*(?:,\s*10\s*)?\)\s*\)`,
    'g'
  );
  source = source.replace(reC, (_m, max, key, def) => {
    seenKeys.add(key);
    replacementCount++;
    modified = true;
    return `safeIntParam(${spExpr(_m, key)}, ${def}, 1, ${formatNum(max)})`;
  });

  // Pattern D: Math.min(parseInt(SP || 'D'), MAX)   (arg order swapped)
  const reD = new RegExp(
    String.raw`Math\.min\(\s*(?:Number\.)?parseInt\(\s*${SP}\s*\|\|\s*['"](\d+)['"]\s*(?:,\s*10\s*)?\)\s*,\s*${NUM}\s*\)`,
    'g'
  );
  source = source.replace(reD, (_m, key, def, max) => {
    seenKeys.add(key);
    replacementCount++;
    modified = true;
    return `safeIntParam(${spExpr(_m, key)}, ${def}, 1, ${formatNum(max)})`;
  });

  // Pattern E: Math.max(1, parseInt(SP || 'D'))
  const reE = new RegExp(
    String.raw`Math\.max\(\s*1\s*,\s*(?:Number\.)?parseInt\(\s*${SP}\s*\|\|\s*['"](\d+)['"]\s*(?:,\s*10\s*)?\)\s*\)`,
    'g'
  );
  source = source.replace(reE, (_m, key, def) => {
    seenKeys.add(key);
    replacementCount++;
    modified = true;
    return `safeIntParam(${spExpr(_m, key)}, ${def}, 1, 1_000_000)`;
  });

  // Pattern F: Bare parseInt(SP || 'D')  — usually `offset` or unbounded `limit`/`days`
  // Default min=0 (offset can be 0), max conservative 1_000_000
  const reF = new RegExp(
    String.raw`(?<![\w.])(?:Number\.)?parseInt\(\s*${SP}\s*\|\|\s*['"](\d+)['"]\s*(?:,\s*10\s*)?\)`,
    'g'
  );
  source = source.replace(reF, (_m, key, def) => {
    seenKeys.add(key);
    replacementCount++;
    modified = true;
    return `safeIntParam(${spExpr(_m, key)}, ${def}, 0, 1_000_000)`;
  });

  if (!modified) return null;

  // Inject `safeIntParam` import if missing
  if (!/safeIntParam/.test(source.split('\n').slice(0, 30).join('\n'))) {
    // Try to merge into existing api import
    const apiImportRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*\/lib\/api)['"];/;
    const match = source.match(apiImportRe);
    if (match) {
      const imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
      if (!imports.includes('safeIntParam')) {
        imports.push('safeIntParam');
        const newImport = `import { ${imports.join(', ')} } from '${match[2]}';`;
        source = source.replace(apiImportRe, newImport);
      }
    } else {
      // Add a fresh import after first import block
      const importEnd = source.search(/\n\n/);
      if (importEnd > 0) {
        const apiPath = relativeApiImport(filePath);
        source = source.slice(0, importEnd) +
          `\nimport { safeIntParam } from '${apiPath}';` +
          source.slice(importEnd);
      }
    }
  }

  stats.modified++;
  stats.replacements += replacementCount;
  return source;

  function spExpr(originalMatch, keyLiteral) {
    // Extract the actual `url.searchParams.get('X')` form from the match
    const re = new RegExp(
      String.raw`((?:url\.|context\.url\.)?searchParams\.get\(\s*${keyLiteral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*\))`
    );
    const m = originalMatch.match(re);
    return m ? m[1] : `url.searchParams.get(${keyLiteral})`;
  }

  function formatNum(n) {
    const num = Number(String(n).replace(/_/g, ''));
    if (num >= 1000) {
      return num.toLocaleString('en-US').replace(/,/g, '_');
    }
    return String(num);
  }
}

const files = walk(ROOT);
for (const file of files) {
  if (SKIP.has(file)) continue;
  stats.scanned++;
  const source = fs.readFileSync(file, 'utf8');
  const transformed = transform(source, file);
  if (transformed && transformed !== source) {
    if (APPLY) {
      fs.writeFileSync(file, transformed, 'utf8');
    }
    console.log(`${APPLY ? '✏️ ' : '🔍'} ${path.relative(process.cwd(), file)}`);
  }
}

console.log(`\n${APPLY ? 'Applied' : 'Dry run'}:`);
console.log(`  Scanned: ${stats.scanned}`);
console.log(`  Modified: ${stats.modified}`);
console.log(`  Replacements: ${stats.replacements}`);
if (!APPLY) console.log('\n→ Re-run with --apply to write changes.');
