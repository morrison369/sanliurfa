/**
 * Static Lock — Hardcoded `localhost`/`127.0.0.1` yasak (HARD RULE #22)
 *
 * Background: Production code'da `localhost` veya `127.0.0.1` URL hardcoded ise
 * deploy environment'ta yanlış host'a bağlanır (DB, Redis, external API). Tüm
 * URL'ler env / config üzerinden yönetilmeli.
 *
 * Allowed pattern:
 *   const dbUrl = process.env.DATABASE_URL;
 *   const redisUrl = import.meta.env.REDIS_URL || 'redis://localhost:6379'; // fallback OK in dev
 *   const baseUrl = getPublicAppUrl();
 *
 * Forbidden pattern:
 *   await fetch('http://localhost:3000/api');     // hardcoded
 *   const dbUrl = 'postgresql://127.0.0.1/db';    // hardcoded
 *
 * Whitelist mechanism: dev/test fallback'lar (`|| 'redis://localhost:6379'`)
 * legitimate. Test/script dosyaları otomatik whitelist (development context).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist (snapshot 2026-04-26): legit fallback dosyaları + dev configs.
// Yeni production code eklerken extend etme — whitelist'e ekleme reason yorumlu olmalı.
const ALLOWED_FILES = new Set<string>([
  'src/lib/cache/cache.ts',                    // `|| 'redis://127.0.0.1:6381'` dev fallback
  'src/lib/social/event-stream.ts',            // pub/sub fallback
  'src/lib/postgres.ts',                       // dev fallback
  'src/middleware.ts',                         // CORS dev origin allow
  'src/lib/deployment/deployment.ts',          // deployment helper dev URL constants
  'src/lib/env.ts',                            // env config dev defaults
  'src/lib/security/__tests/rate-limit.spec.ts', // unit test fixtures (Request mock URLs)
  'src/pages/api/docs/openapi.json.ts',        // OpenAPI spec dev server URL (servers[]) entry
]);

// Match: hardcoded http(s)://localhost or 127.0.0.1, OR DB/Redis-style URL with these hosts.
// Skip lines that have `||` (fallback pattern) or comments.
const HARDCODED_PATTERN = /(https?:\/\/(localhost|127\.0\.0\.1)|(?:postgresql|postgres|redis|mysql|mongodb):\/\/[^@\s]*(localhost|127\.0\.0\.1))/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(ts|tsx|astro)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Hardcoded localhost/127.0.0.1 yasak (HARD RULE #22)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no production source uses hardcoded localhost / 127.0.0.1 URL', () => {
    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (!HARDCODED_PATTERN.test(source)) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (!HARDCODED_PATTERN.test(line)) continue;
        // Allow lines with `||` fallback pattern (env || 'http://localhost:N')
        if (/\|\|\s*['"`]/.test(line)) continue;
        violations.push({ file: rel, line: i + 1, snippet: trimmed.slice(0, 120) });
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} hardcoded localhost/127.0.0.1 URL bulundu. ` +
        `Use env (process.env.X) veya getPublicAppUrl() helper:\n${msg}`
      );
    }
  });
});
