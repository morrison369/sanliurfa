/**
 * Static Lock — `JSON.parse(cached as string)` after getCache yasak
 *
 * Background: Batch #208 — `getCache<T>()` zaten parse'lı `T | null` döndürür.
 * Caller'da `JSON.parse(cached as string)` pattern her cache hit'te SyntaxError
 * fırlatır (object → "[object Object]" → invalid JSON), outer try/catch yakalar,
 * function null döner. Cache layer 17 modülde dead idi.
 *
 * Fix: `return cached as <Type>;` (cached zaten parse'lı).
 *
 * Forbidden pattern:
 *   const cached = await getCache(key);
 *   if (cached) return JSON.parse(cached as string);  // BUG
 *
 * Allowed pattern:
 *   const cached = await getCache<MyType>(key);
 *   if (cached) return cached;                        // ya da `as MyType` cast
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIB_ROOT = join(process.cwd(), 'src', 'lib');
const PAGES_ROOT = join(process.cwd(), 'src', 'pages');

const ALLOWED_FILES = new Set<string>([
  // Şu an exception yok — sweep tam.
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory() && !p.includes('__tests__') && !p.includes('node_modules')) {
      out.push(...walk(p));
    } else if (stat.isFile() && (p.endsWith('.ts') || p.endsWith('.astro'))) {
      out.push(p);
    }
  }
  return out;
}

function relPath(absolutePath: string): string {
  const cwd = process.cwd();
  return absolutePath.replace(cwd, '').replace(/\\/g, '/').replace(/^\//, '');
}

const FORBIDDEN_PATTERN = /JSON\.parse\(\s*cached\s+as\s+string\s*\)/;

describe('Security Regression Lock — no double-parse on getCache result', () => {
  it('no file uses JSON.parse(cached as string) after getCache (cache layer dead bug)', () => {
    const violations: { file: string; line: number; content: string }[] = [];

    const files = [...walk(LIB_ROOT), ...walk(PAGES_ROOT)];
    for (const filePath of files) {
      const rel = relPath(filePath);
      if (ALLOWED_FILES.has(rel)) continue;

      const content = readFileSync(filePath, 'utf-8');
      // Sadece `getCache` import veya kullanan dosyalarda kontrol et
      if (!content.includes('getCache')) continue;

      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (FORBIDDEN_PATTERN.test(line)) {
          violations.push({ file: rel, line: idx + 1, content: line.trim() });
        }
      });
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line}\n    ${v.content}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} double-parse violation(s) — getCache returns parsed T, ` +
          `not string. Use \`return cached as <Type>;\` instead:\n${summary}`,
      );
    }

    expect(violations).toEqual([]);
  });
});
