/**
 * Static Lock — Redis namespace bypass yasak
 *
 * Background: Proje shared Redis instance kullanıyor (CLAUDE.md "Isolation is critical").
 * Tüm Redis key'leri `sanliurfa:` prefix ile namespace edilmeli — aksi halde başka
 * proje key'leri ile collision olur (data corruption / cross-tenant data leak).
 *
 * Allowed pattern:
 *   import { getCache, setCache, deleteCache, prefixKey, redis } from '@/lib/cache/cache';
 *   await getCache(`places:${id}`);              // helper otomatik prefixKey() uygular
 *   const r = await getRedisClient();
 *   await r.expire(prefixKey(`session:${t}`));   // direct client ama prefixKey() ile sarılmış
 *
 * Forbidden pattern:
 *   const client = await getRedisClient();
 *   await client.get('places:123');  // RAW key — namespace bypass!
 *   await createClient(...).get('foo');  // direct Redis client + raw key
 *
 * Strategy: bir dosya `getRedisClient()` veya `createClient()` kullanıyorsa,
 * AYNI dosyada `prefixKey(` veya `KEY_PREFIX` veya `'sanliurfa:'` literal de
 * görünmeli (namespace uygulanmış kanıtı). Aksi halde violation.
 *
 * Cache infrastructure dosyaları ALLOWED_FILES whitelist'inde — `prefixKey()`'i
 * IMPLEMENT eden helper'lar (kendileri kullanıcı değiller).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist — cache infrastructure dosyaları getRedisClient() / createClient() çağırabilir
// (helper'ları implement ederler; namespace prefix'i internally uygularlar).
const ALLOWED_FILES = new Set<string>([
  'src/lib/cache/cache.ts',           // primary cache helpers (prefixKey + getCache/setCache/...)
  'src/lib/cache/redis.ts',           // low-level Redis client wrapper
  'src/lib/cache/redis-cache.ts',     // alternative cache implementation
  'src/lib/cache/advanced.ts',        // advanced cache patterns (multi-level)
  'src/lib/lifecycle.ts',             // graceful shutdown — Redis client.quit() çağrılır
  'src/pages/api/health.ts',          // sadece redis.ping() — key-less introspection
  'src/pages/api/health/detailed.ts', // sadece redis.ping() — key-less introspection
  'src/pages/api/metrics.ts',         // sadece redis.ping() — key-less introspection
]);

const RAW_CLIENT_USAGE = /\bgetRedisClient\s*\(|\bcreateClient\s*\(\s*\{[^}]*url\s*:/;
const NAMESPACE_PROOF = /\bprefixKey\s*\(|\bKEY_PREFIX\b|['"]sanliurfa:/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && (p.endsWith('.ts') || p.endsWith('.tsx'))) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Redis namespace bypass yasak', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 .ts/.tsx files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('every file using raw Redis client also applies prefixKey() namespace', () => {
    const violations: Array<{ file: string; reason: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (!RAW_CLIENT_USAGE.test(source)) continue;

      // File uses getRedisClient/createClient — must also evidence namespace usage.
      if (!NAMESPACE_PROOF.test(source)) {
        violations.push({
          file: rel,
          reason: 'uses getRedisClient/createClient but no prefixKey() / KEY_PREFIX / "sanliurfa:" found in same file',
        });
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}\n    → ${v.reason}`)
        .join('\n');
      throw new Error(
        `${violations.length} Redis namespace bypass bulundu. Direct Redis client ` +
        `kullanan her dosya prefixKey() ile sarmalı. Helper API'ye geç ` +
        `(getCache/setCache/deleteCache/redis.{get,set,del}) veya prefixKey() ile ` +
        `wrap et:\n${msg}`
      );
    }
  });
});
