/**
 * Static Lock — React Island'larda process.env yasak
 *
 * Background: React (.tsx/.jsx) component'leri `client:load`/`client:idle`/`client:visible`
 * direktifiyle browser'da hydrate olur. Browser'da `process.env` undefined döner →
 * `process.env.X` her zaman undefined sonuç verir → silent display bug (örn. boş GA ID,
 * boş feature flag, broken UI).
 *
 * Astro'nun çözümü: `import.meta.env.PUBLIC_*` (build-time inline replace, browser'a
 * expose). `PUBLIC_` prefix olmayan env'ler sadece server-side görünür.
 *
 * Allowed pattern:
 *   const apiUrl = import.meta.env.PUBLIC_SITE_URL;
 *   const ga = import.meta.env.PUBLIC_GA_MEASUREMENT_ID;
 *
 * Forbidden patterns:
 *   const apiUrl = process.env.SITE_URL;   // browser undefined
 *   const ga = process.env.GA_TRACKING_ID; // browser undefined
 *
 * Exception: `process.env.NODE_ENV` Vite/Astro tarafından build-time string replace
 * edilir → her tarafta çalışır (whitelist'te explicit).
 *
 * Scope: SADECE `.tsx`/`.jsx` (React component) dosyaları taranır. `.ts` (server lib),
 * `.astro` (frontmatter SSR) dosyaları muaf — orada process.env legitimate.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const COMPONENT_ROOTS = [
  join(process.cwd(), 'src', 'components'),
  join(process.cwd(), 'src', 'pages'), // pages içinde de .tsx olabilir
];

// Whitelist — explicit exception with reason.
const ALLOWED_FILES = new Set<string>([
  // Şu an exception yok.
]);

// Allowed env access patterns inside React (build-time inlined → browser-safe)
const ALLOWED_ENV_REFS = new RegExp(
  '\\bprocess\\.env\\.NODE_ENV\\b|' +              // Vite inline replace
  '\\bimport\\.meta\\.env\\.',                      // Astro recommended
  ''
);

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && (p.endsWith('.tsx') || p.endsWith('.jsx'))) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — React Island\'larda process.env yasak', () => {
  const files = COMPONENT_ROOTS.flatMap(walk);

  it('finds at least 50 .tsx/.jsx React component files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no .tsx/.jsx file uses process.env (except NODE_ENV) — must use import.meta.env.PUBLIC_*', () => {
    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;
      // Skip test files — vitest setup uses process.env legitimately
      if (file.endsWith('.test.tsx') || file.endsWith('.test.jsx')) continue;

      const source = readFileSync(file, 'utf8');
      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Match `process.env.X` where X is NOT NODE_ENV
        const envRefs = line.match(/\bprocess\.env\.[A-Z_][A-Z0-9_]*/g);
        if (!envRefs) continue;

        for (const ref of envRefs) {
          if (ref === 'process.env.NODE_ENV') continue; // build-time replace OK
          violations.push({ file: rel, line: i + 1, snippet: line.trim() });
          break; // one violation per line is enough
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} React component process.env kullanımı bulundu. ` +
        `Browser'da undefined döner. Use import.meta.env.PUBLIC_* instead:\n${msg}`
      );
    }
  });
});
