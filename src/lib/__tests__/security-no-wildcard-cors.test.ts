/**
 * Static Lock — Wildcard CORS on API Endpoints (HARD RULE #34)
 *
 * Background: `Access-Control-Allow-Origin: '*'` on an authenticated API
 * endpoint creates a CORS data-exfiltration risk. A malicious page at
 * evil.com opens `EventSource('https://sanliurfa.com/api/realtime/notifications')`;
 * the browser sends the auth cookie (if SameSite is ever relaxed from Strict)
 * and `evil.com` reads the authenticated SSE stream.
 *
 * CORS is handled centrally by `src/middleware.ts` (allowlist-based). Individual
 * endpoint files MUST NOT set their own `Access-Control-Allow-Origin: *`.
 *
 * Allowed exception: `api/image/[...path].ts` — public image proxy endpoint;
 * wildcard CORS lets any page fetch optimised images (cross-origin <img>).
 *
 * Forbidden pattern:
 *   headers: { 'Access-Control-Allow-Origin': '*' }
 *
 * Allowed pattern (for API routes):
 *   // CORS handled by middleware.ts CORS_ORIGINS allowlist
 *   headers: { 'Content-Type': 'text/event-stream' }
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const API_ROOT = join(process.cwd(), 'src', 'pages', 'api');

// Public endpoints where wildcard CORS is intentional:
// image/[...path].ts serves as a public image proxy — cross-origin image tags need it.
const ALLOWED_FILES = new Set<string>([
  'src/pages/api/image/[...path].ts',
]);

const WILDCARD_CORS_PATTERN = /Access-Control-Allow-Origin['":\s,]+['"]\s*\*/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(ts|tsx)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Wildcard CORS on API endpoints (HARD RULE #34)', () => {
  const files = walk(API_ROOT);

  it('finds at least 10 API files (sanity)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('no API endpoint sets Access-Control-Allow-Origin: * (use middleware.ts CORS_ORIGINS allowlist)', () => {
    const violations: string[] = [];

    for (const file of files) {
      const parts = file.split(sep);
      const srcIdx = parts.indexOf('src');
      const rel = parts.slice(srcIdx).join('/');

      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (WILDCARD_CORS_PATTERN.test(source)) {
        violations.push(rel);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} API dosyası 'Access-Control-Allow-Origin: *' kullanıyor. ` +
        `Wildcard CORS + authentication = CORS data exfiltration riski (HARD RULE #34).\n` +
        `CORS merkezi olarak middleware.ts CORS_ORIGINS allowlist ile yönetilir.\n` +
        `SSE endpoint'lerde sadece SSE header'larını set edin:\n` +
        `  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }\n\n` +
        `Affected files:\n` +
        violations.map((v) => `  - ${v}`).join('\n')
      );
    }
  });
});
