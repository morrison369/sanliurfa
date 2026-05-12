/**
 * Static Lock — E2E Bypass Env Vars Must Be Gated By NODE_ENV (HARD RULE #37)
 *
 * E2E convenience env vars (`E2E_ADMIN_BYPASS`, `E2E_RATE_LIMIT_BYPASS`, etc.)
 * disable security checks for Playwright tests. Without a
 * `NODE_ENV !== 'production'` guard on the same conditional, accidentally
 * setting one of these env vars in production would disable auth/rate-limiting
 * entirely — a complete security bypass.
 *
 * Correct pattern (non-production only):
 *   if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
 *   const bypassed = process.env.NODE_ENV !== 'production' && process.env.E2E_RATE_LIMIT_BYPASS === '1';
 *
 * Forbidden:
 *   if (process.env.E2E_ADMIN_BYPASS === '1') return true;  ← no env guard
 *   const bypassed = process.env.E2E_RATE_LIMIT_BYPASS === '1'; ← no env guard
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...walk(p));
    } else if (s.isFile() && /\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

// This test file itself references the patterns for detection — self-exempt.
const ALLOWED_FILES = new Set<string>([
  'src/lib/__tests__/security-e2e-bypass-prod-guard.test.ts',
]);

function toRelative(absolute: string): string {
  const parts = absolute.split(sep);
  const idx = parts.indexOf('src');
  return parts.slice(idx).join('/');
}

// All E2E bypass env var names — any new bypass must be listed here
const E2E_BYPASS_VARS = ['E2E_ADMIN_BYPASS', 'E2E_RATE_LIMIT_BYPASS'];

describe('Static Lock — E2E bypass env vars must be gated by NODE_ENV (HARD RULE #37)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 50 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('every E2E_*_BYPASS check includes NODE_ENV !== production guard', () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      const rel = toRelative(file);
      if (ALLOWED_FILES.has(rel)) continue;

      for (const bypassVar of E2E_BYPASS_VARS) {
        if (!source.includes(bypassVar)) continue;

        const lines = source.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.includes(bypassVar) || !line.includes("=== '1'")) continue;

          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

          if (!line.includes("NODE_ENV !== 'production'")) {
            violations.push(`${rel}:${i + 1}: ${trimmed}`);
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} E2E bypass kullanımı NODE_ENV guard olmadan (HARD RULE #37).\n` +
        `Doğru pattern: process.env.NODE_ENV !== 'production' && process.env.E2E_*_BYPASS === '1'\n\n` +
        `Affected lines:\n` +
        violations.map(v => `  - ${v}`).join('\n'),
      );
    }
  });
});
