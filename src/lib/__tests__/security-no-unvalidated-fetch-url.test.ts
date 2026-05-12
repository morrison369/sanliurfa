/**
 * Static Lock — SSRF: User-supplied URL passed to fetch() (HARD RULE #33)
 *
 * Background: Server-side `fetch(userSuppliedUrl)` without URL validation lets
 * attackers reach internal services: AWS metadata (`169.254.169.254`), localhost
 * databases, internal admin panels, etc.
 *
 * This lock walks `src/lib/webhook*` and `src/pages/api/webhooks/` looking for
 * fetch() calls whose URL argument comes from a DB row (`webhook.url`,
 * `event.url`, `job.url`) and verifies the surrounding code calls
 * `validateExternalUrl()` first.
 *
 * Forbidden pattern:
 *   const response = await fetch(webhook.url, { method: 'POST', ... });
 *
 * Allowed pattern:
 *   const urlCheck = validateExternalUrl(webhook.url);
 *   if (!urlCheck.ok) { skip-or-fail; }
 *   const response = await fetch(webhook.url, ...);
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist: file is allowed to fetch URLs without inline validation.
// (Reason: not user-supplied, OR validated upstream, OR explicit dev tool.)
const ALLOWED_FILES = new Set<string>([
  'src/lib/city-content-agents.ts',  // Hardcoded RSS source allowlist (admin curated, not user-input)
]);

const FETCH_URL_PATTERNS = [
  /fetch\(\s*webhook\.url\b/,
  /fetch\(\s*event\.url\b/,
  /fetch\(\s*job\.url\b/,
];
const VALIDATION_PATTERN = /validateExternalUrl\s*\(/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(ts|tsx)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — SSRF: unvalidated fetch(userUrl) (HARD RULE #33)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('every fetch(webhook.url|event.url|job.url) call has validateExternalUrl() in same file', () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      const hasUnsafeFetch = FETCH_URL_PATTERNS.some((re) => re.test(source));
      if (!hasUnsafeFetch) continue;

      if (!VALIDATION_PATTERN.test(source)) {
        violations.push(rel);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} dosya DB-sourced URL'i fetch() ile çağırırken validateExternalUrl() kullanmıyor. ` +
        `SSRF riski (AWS metadata 169.254.169.254, internal localhost services). Use:\n` +
        `  import { validateExternalUrl } from '@/lib/security/safe-url';\n` +
        `  const check = validateExternalUrl(webhook.url);\n` +
        `  if (!check.ok) { skip-or-fail; }\n` +
        `  const response = await fetch(webhook.url, ...);\n\n` +
        `Affected files:\n` +
        violations.map((v) => `  - ${v}`).join('\n')
      );
    }
  });
});
