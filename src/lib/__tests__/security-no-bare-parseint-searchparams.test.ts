/**
 * Static Lock — `parseInt(searchParams.get(...))` pattern yasak
 *
 * Background: Bug #38 — `parseInt('abc')` → NaN, `Math.max(1, NaN)` → NaN,
 * NaN as PostgreSQL bind value yields undefined behavior (silent crash or
 * malformed SQL). Sweep'te 96 dosyada 127 lokasyon `safeIntParam(...)` ile
 * değiştirildi. Bu test gelecekteki regression'ı engeller.
 *
 * Allowed pattern:
 *   const limit = safeIntParam(url.searchParams.get('limit'), DEFAULT, MIN, MAX);
 *
 * Forbidden patterns:
 *   parseInt(url.searchParams.get('X') || 'N')           // unbounded NaN risk
 *   Math.min(N, parseInt(url.searchParams.get('X')))     // unguarded NaN
 *   Math.max(1, parseInt(url.searchParams.get('X')))     // unguarded NaN
 *
 * Whitelist mechanism: legitimate exception'lar için `ALLOWED_FILES` Set'ine
 * inline yorumlu ekle. Şu an exception yok — sweep tam.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const API_ROOT = join(process.cwd(), 'src', 'pages', 'api');

// Whitelist — explicit exception with reason. Sweep sonucu boş.
const ALLOWED_FILES = new Set<string>([
  // Şu an exception yok. Yeni eklenirse: file path + reason yorumu.
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (stat.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const VULNERABLE_PATTERNS: Array<{ name: string; re: RegExp }> = [
  {
    name: 'Math.min(N, parseInt(searchParams.get(...)))',
    re: /Math\.min\(\s*\d[\d_]*\s*,\s*(?:Number\.)?parseInt\(\s*(?:[a-zA-Z_]\w*\.)?searchParams\.get/,
  },
  {
    name: 'Math.min(parseInt(searchParams.get(...)), N)',
    re: /Math\.min\(\s*(?:Number\.)?parseInt\(\s*(?:[a-zA-Z_]\w*\.)?searchParams\.get[^)]*\)[^)]*\)\s*,\s*\d[\d_]*\s*\)/,
  },
  {
    name: 'Math.max(1, parseInt(searchParams.get(...)))',
    re: /Math\.max\(\s*1\s*,\s*(?:Number\.)?parseInt\(\s*(?:[a-zA-Z_]\w*\.)?searchParams\.get/,
  },
  {
    name: 'Bare parseInt(searchParams.get(...) || "N")',
    re: /(?<![\w.])(?:Number\.)?parseInt\(\s*(?:[a-zA-Z_]\w*\.)?searchParams\.get\([^)]+\)\s*(?:!\s*)?(?:\|\|\s*['"]\d+['"]\s*)?(?:,\s*10\s*)?\)/,
  },
];

describe('Static Lock — parseInt(searchParams) pattern yasak', () => {
  const files = walk(API_ROOT);

  it('finds at least 50 .ts API endpoints (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no file uses Math.min/Math.max + parseInt(searchParams) — must use safeIntParam', () => {
    const violations: Array<{ file: string; pattern: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines + the lock test file itself
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        for (const { name, re } of VULNERABLE_PATTERNS) {
          if (re.test(line)) {
            violations.push({ file: rel, pattern: name, line: i + 1, snippet: line.trim() });
          }
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line} — ${v.pattern}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} vulnerable parseInt(searchParams) pattern bulundu. ` +
        `Use safeIntParam(input, default, min, max) instead:\n${msg}`
      );
    }
  });
});
