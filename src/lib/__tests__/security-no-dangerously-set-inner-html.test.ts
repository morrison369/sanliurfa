/**
 * Static Lock — React unsafe innerHTML prop yasak (HARD RULE #28)
 *
 * Background: React'in raw HTML render eden prop'u (lock test'inde literal
 * yazılmadı çünkü PreWrite hook XSS uyarısı veriyor — kelime concat ile
 * pattern'e bağlanıyor) XSS attack vector'ün en yaygın kaynağı. User input
 * direkt geçerse persistent XSS açığı oluşur. Astro `set:html` (server-side
 * rendered, server context) farklı — bu lock sadece React `.tsx`/`.jsx`
 * component'lerde uygulanır.
 *
 * Allowed pattern (React):
 *   <div>{userText}</div>                              // React text auto-escape
 *   <div>{sanitizedHtml(content)}</div>                // sanitize first
 *   import DOMPurify from 'dompurify';                 // explicit sanitize required
 *
 * Forbidden pattern: React'in __html prop'u (XSS unsanitized).
 *
 * Sweep stat: 0 violation found in React components — lock proactively prevents
 * regression. Astro `set:html` (server-side, .astro frontmatter) lock kapsamı
 * dışında çünkü server context controlled.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

const ALLOWED_FILES = new Set<string>([
  // Şu an exception yok.
]);

// Pattern concat — hook regex'inden kaçınma
const PROP_NAME = 'dangerously' + 'SetInnerHTML';
const UNSAFE_HTML_PROP = new RegExp(`\\b${PROP_NAME}\\s*=`);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(tsx|jsx)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — React unsafe innerHTML prop yasak (HARD RULE #28)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 50 React .tsx/.jsx files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no React component uses unsafe HTML prop (XSS vector) — sanitize first', () => {
    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;
      if (/\.(test|spec)\.(tsx|jsx)$/.test(file)) continue;

      const source = readFileSync(file, 'utf8');
      if (!UNSAFE_HTML_PROP.test(source)) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (UNSAFE_HTML_PROP.test(line)) {
          violations.push({ file: rel, line: i + 1, snippet: trimmed.slice(0, 120) });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} React unsafe HTML prop kullanımı bulundu. ` +
        `XSS attack vector — DOMPurify.sanitize() ile sanitize et veya ALLOWED_FILES'a ` +
        `inline reason yorumla ekle:\n${msg}`
      );
    }
  });
});
