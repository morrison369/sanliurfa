/**
 * Static Lock — `localStorage.setItem('token'/'password'/'jwt'/'secret', ...)` yasak
 * (HARD RULE #27)
 *
 * Background: localStorage browser-side persistent storage (XSS attacker JavaScript
 * tarafından okunabilir). JWT token, password, API secret, session ID gibi sensitive
 * credential'lar localStorage'a YAZILMAMALI — httpOnly cookie + session cookie tercih.
 *
 * Allowed pattern:
 *   localStorage.setItem('theme', 'dark');                     // UI preference
 *   localStorage.setItem('user-settings', JSON.stringify(...)); // non-sensitive
 *   document.cookie = '...';  // httpOnly+secure cookie auth (server-set)
 *
 * Forbidden pattern:
 *   localStorage.setItem('token', jwt);                        // XSS vulnerable
 *   localStorage.setItem('jwt', authToken);                    // XSS vulnerable
 *   localStorage.setItem('password', user.password);           // never
 *   localStorage.setItem('secret', apiKey);                    // never
 *   localStorage.setItem('session', sessionId);                // session hijacking
 *   localStorage.setItem('auth-token', t);                     // XSS
 *   sessionStorage.setItem('access-token', t);                 // sessionStorage same risk
 *
 * Bu lock dosya tarama ile sensitive key string literal substring'lerini yakalar.
 * Whitelist: yok (sweep tam temiz olmalı; yeni kullanım ALLOWED_FILES + reason yorumu ile).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

const ALLOWED_FILES = new Set<string>([
  // GA session ID — analytics tracking ID (anonim user identifier), auth credential değil
  'src/lib/analytics/google-analytics.ts',
]);

// Pattern: localStorage/sessionStorage.setItem with sensitive key substring
const SENSITIVE_KEY_KEYWORDS = ['token', 'jwt', 'password', 'secret', 'session', 'auth'];
const STORAGE_PATTERN = new RegExp(
  `(local|session)Storage\\.setItem\\(\\s*['"\`]([^'"\`]*(${SENSITIVE_KEY_KEYWORDS.join('|')})[^'"\`]*)['"\`]`,
  'i'
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|tsx?|jsx?|mjs)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — localStorage sensitive credential yasak (HARD RULE #27)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no source writes token/password/secret/session/auth/jwt to localStorage/sessionStorage', () => {
    const violations: Array<{ file: string; line: number; key: string; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;
      if (/\.(test|spec)\.(ts|tsx)$/.test(file)) continue;

      const source = readFileSync(file, 'utf8');
      if (!STORAGE_PATTERN.test(source)) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        const m = line.match(STORAGE_PATTERN);
        if (m) {
          violations.push({
            file: rel,
            line: i + 1,
            key: m[2],
            snippet: trimmed.slice(0, 120),
          });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line} — key="${v.key}"\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} localStorage/sessionStorage sensitive credential write bulundu. ` +
        `Token/password/session XSS-vulnerable; httpOnly cookie kullan:\n${msg}`
      );
    }
  });
});
