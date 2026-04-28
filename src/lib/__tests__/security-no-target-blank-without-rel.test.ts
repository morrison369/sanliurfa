/**
 * Static Lock — `target="_blank"` without `rel="noopener"` yasak (HARD RULE #29)
 *
 * Background: `<a target="_blank">` yeni sekmede açılır. Eğer `rel="noopener"`
 * (veya `rel="noreferrer"`) yoksa, açılan sayfa `window.opener` ile orijinal
 * sayfaya erişebilir → tab-nabbing attack: yeni sayfa orijinal'i phishing
 * URL'ine redirect edebilir. Tüm modern browser'lar artık `_blank` için
 * varsayılan implicit `noopener` uygular ama defense-in-depth için explicit
 * yazma standardı.
 *
 * Allowed pattern:
 *   <a href="..." target="_blank" rel="noopener">...</a>
 *   <a href="..." target="_blank" rel="noreferrer">...</a>
 *   <a href="..." target="_blank" rel="noopener noreferrer">...</a>
 *
 * Forbidden pattern:
 *   <a href="..." target="_blank">...</a>           // missing rel
 *
 * Snapshot strategy: 9 mevcut admin dosyası whitelist'te; yeni eklenen dosya
 * `target="_blank"` kullanırsa `rel` ile gelmeli, aksi halde CI fail.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

const ALLOWED_FILES = new Set<string>([
  // Snapshot 2026-04-26 — admin pages legacy target="_blank"
  'src/pages/admin/blog/analytics.astro',
  'src/pages/admin/blog/comments.astro',
  'src/pages/admin/blog/edit/[id].astro',
  'src/pages/admin/blog/index.astro',
  'src/pages/admin/blog/posts.astro',
  'src/pages/admin/categories.astro',
  'src/pages/admin/events/index.astro',
  'src/pages/admin/historical-sites/index.astro',
  'src/pages/admin/places.astro',
  'src/pages/admin/api-docs.astro',
  'src/pages/admin/reports.astro',
  'src/pages/icerik-rehberi.astro',
  'src/pages/tarihi-yerler/[slug].astro',
  'src/pages/vendor/dashboard.astro',
]);

const ANCHOR_BLANK = /<a\s[^>]*target=["']_blank["'][^>]*>/g;
const HAS_REL = /rel=["'][^"']*(noopener|noreferrer|nofollow)/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|tsx?|jsx?|mdx)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — target="_blank" without rel yasak (HARD RULE #29)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no NEW file uses target="_blank" without rel="noopener" (tab-nabbing defense)', () => {
    const newViolations: string[] = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      const matches = source.matchAll(ANCHOR_BLANK);
      for (const m of matches) {
        const tag = m[0];
        if (!HAS_REL.test(tag) && !/rel=\{/.test(tag)) {
          newViolations.push(rel);
          break; // one violation per file is enough
        }
      }
    }

    if (newViolations.length > 0) {
      throw new Error(
        `${newViolations.length} YENİ dosya target="_blank" rel="noopener" eksik. ` +
        `Tab-nabbing attack defense-in-depth gerekli:\n` +
        newViolations.map(v => `  - ${v}`).join('\n')
      );
    }
  });
});
