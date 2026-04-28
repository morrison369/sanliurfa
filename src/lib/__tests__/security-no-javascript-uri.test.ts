/**
 * Static Lock — `href="javascript:..."` URI yasak (HARD RULE #31)
 *
 * Background: `<a href="javascript:doSomething()">` browser'da inline JavaScript
 * eval eder — XSS vector klasik. User input URL'inden gelirse persistent XSS.
 * Modern alternative: `onclick={handler}` veya React `onClick={handler}` —
 * function reference, eval değil.
 *
 * Allowed pattern:
 *   <a href="/path">link</a>                              // normal navigation
 *   <button onClick={handler}>action</button>             // button + handler
 *   <a href="#" onClick={(e) => { e.preventDefault(); ... }}>action</a>  // explicit prevent
 *
 * Forbidden pattern:
 *   <a href="javascript:void(0)">click</a>                // XSS surface + UX bozuk
 *   <a href="javascript:doThing()">click</a>              // direct eval
 *   <a href={`javascript:${userInput}`}>...</a>           // template injection
 *
 * Sweep stat: 0 violation found — proactive lock gelecek regression engelle.
 *
 * Whitelist: yok. javascript: URI hiçbir use case için legit değil; ALLOWED_FILES
 * eklemek için exception inline reason yorumlu olmalı.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

const ALLOWED_FILES = new Set<string>([
  // Şu an exception yok.
]);

// Match: href starts with "javascript:" (HTML attribute or template literal)
const JAVASCRIPT_URI = /href\s*=\s*[{`"']?\s*[`"']javascript:/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|tsx?|jsx?|mdx|html)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — javascript: URI yasak (HARD RULE #31)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no source uses href="javascript:..." (XSS vector + UX broken)', () => {
    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (!JAVASCRIPT_URI.test(source)) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (JAVASCRIPT_URI.test(line)) {
          violations.push({ file: rel, line: i + 1, snippet: trimmed.slice(0, 120) });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} javascript: URI kullanımı bulundu. ` +
        `XSS vector — onClick handler veya button kullan:\n${msg}`
      );
    }
  });
});
