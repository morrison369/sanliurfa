/**
 * Security Regression Lock — Vendor-Only IDOR Antipattern Detection
 *
 * 2026-04-25 audit'inde 7 endpoint'te `if (auth.user.role === 'vendor')` only
 * pattern bulundu — user/moderator role'ler 403 yerine erişim alıyordu.
 *
 * Bu test STATIC GUARD: gelecek code change'lerde aynı antipattern eklenirse
 * yakalanır. CLAUDE.md HARD RULE #11 enforce edilmiş olur.
 *
 * **Doğru pattern (3-yol switch):**
 * ```ts
 * if (auth.user.role === 'admin') { ... }
 * else if (auth.user.role === 'vendor') { ... }
 * else { return 403 }
 * ```
 *
 * **Antipattern**: `if (vendor)` block standalone, `else { return 403 }` clause yok.
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const API_DIR = join(process.cwd(), 'src', 'pages', 'api');

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTsFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      yield fullPath;
    }
  }
}

function relativeFromRepoRoot(absolutePath: string): string {
  const sep = process.cwd().includes('\\') ? '\\' : '/';
  return absolutePath.replace(process.cwd() + sep, '').replace(/\\/g, '/');
}

/**
 * Detect vendor-only check without admin OR else-403 fallback.
 *
 * Heuristic: file contains `role === 'vendor'` but NOT `role === 'admin'`
 * AND NOT a 3-yol switch pattern (else { return ... 403 ... }).
 *
 * False positive risk: low — most vendor checks are in endpoints that need
 * 3-yol switch. If file is GET listing with vendor-only filter (not auth check),
 * it should be in allowlist.
 */
const ALLOWED_VENDOR_ONLY = new Set([
  // GET listing endpoints where vendor-only is intentional filter (not auth):
  // Currently empty — all vendor checks should follow 3-yol pattern.
]);

describe('Security Regression Lock — vendor-only IDOR antipattern', () => {
  it('all endpoints with vendor role check also have admin OR else-403', async () => {
    const violations: { file: string; reason: string }[] = [];

    for await (const filePath of walkTsFiles(API_DIR)) {
      const relPath = relativeFromRepoRoot(filePath);
      if (ALLOWED_VENDOR_ONLY.has(relPath)) continue;

      const content = await readFile(filePath, 'utf-8');

      const hasVendorCheck = /role\s*===\s*['"]vendor['"]/.test(content);
      if (!hasVendorCheck) continue;

      // Doğru pattern göstergeleri:
      // 1. `role === 'admin'` da check ediliyor (3-yol)
      // 2. `else { ... 403 ... }` veya `else { return ... 403 ...}` var
      // 3. `placeId === ` ile resource ownership match check ediliyor
      const hasAdminCheck = /role\s*===\s*['"]admin['"]/.test(content);
      const hasElse403 = /else\s*\{[^}]*403/.test(content) || /\}\s*else\s*\{[\s\S]{0,200}403/.test(content);
      const hasPlaceIdMatch = /auth\.placeId\s*===/.test(content);

      // Antipattern: vendor check var ama admin de else-403 da yok
      if (!hasAdminCheck && !hasElse403 && !hasPlaceIdMatch) {
        violations.push({
          file: relPath,
          reason: 'vendor role check without admin/else-403 (3-yol switch)',
        });
      }
    }

    if (violations.length > 0) {
      const summary = violations.map(v => `  ${v.file}\n    Reason: ${v.reason}`).join('\n');
      throw new Error(
        `Found ${violations.length} vendor-only IDOR antipattern violation(s):\n${summary}\n\n` +
        `Required pattern (CLAUDE.md HARD RULE #11):\n` +
        `  if (role === 'admin') { /* tam erişim */ }\n` +
        `  else if (role === 'vendor') { /* ownership check */ }\n` +
        `  else { return 403 }\n\n` +
        `If file is intentionally vendor-only (e.g. listing filter), add to ALLOWED_VENDOR_ONLY.`
      );
    }

    expect(violations).toEqual([]);
  });
});
