/**
 * Static Lock — `<input type="password">` autocomplete attribute zorunlu (HARD RULE #30)
 *
 * Background: Browser password manager + screen reader UX'i için password input'larda
 * `autocomplete="current-password"` (login) veya `autocomplete="new-password"`
 * (signup, change password) attribute'u zorunlu. Eksik olursa:
 *   - Browser autofill yanlış field'a doldurur
 *   - 1Password/Bitwarden gibi password manager'lar field'ı algılayamaz
 *   - WCAG accessibility uyumsuzluğu
 *   - "current-password" eksikse password manager save UX'i bozulur
 *
 * Allowed pattern:
 *   <input type="password" autocomplete="current-password" />  // login form
 *   <input type="password" autocomplete="new-password" />      // signup, change password
 *   <input type="password" autocomplete="off" />               // sensitive ops (admin re-auth)
 *
 * Forbidden pattern:
 *   <input type="password" name="..." />                       // missing autocomplete
 *
 * Sweep stat: 0 violation found (3 fix bu turn'de yapıldı). Proactive lock.
 *
 * Whitelist: yok. Yeni pattern (örn. dynamic autocomplete={...}) ALLOWED_FILES'a eklenir.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist boş — tüm password input'lar autocomplete attribute'a sahip.
const ALLOWED_FILES = new Set<string>([]);

const PASSWORD_INPUT = /<input\s[^>]*type=["']password["'][^>]*>/g;
// HTML lowercase (autocomplete) + JSX camelCase (autoComplete) ikisini de kabul et.
const HAS_AUTOCOMPLETE = /\bauto[Cc]omplete\s*=/;

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

describe('Static Lock — password input autocomplete zorunlu (HARD RULE #30)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('every <input type="password"> has autocomplete attribute (UX + a11y)', () => {
    const violations: Array<{ file: string; tag: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      const matches = source.matchAll(PASSWORD_INPUT);
      for (const m of matches) {
        const tag = m[0];
        if (!HAS_AUTOCOMPLETE.test(tag)) {
          violations.push({ file: rel, tag: tag.slice(0, 120) });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}\n    ${v.tag}`)
        .join('\n');
      throw new Error(
        `${violations.length} password input autocomplete attribute eksik. ` +
        `Browser password manager + WCAG için zorunlu (current-password / new-password):\n${msg}`
      );
    }
  });
});
