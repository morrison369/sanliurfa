/**
 * Security Regression Lock — Middleware Body Size Cap
 *
 * 2026-04-25 audit'inde 243 endpoint request body okuyor, application-layer
 * size cap yoktu. Attacker 100MB JSON ile DoS yapabilirdi.
 *
 * CLAUDE.md HARD RULE #13: middleware'de Content-Length cap zorunlu.
 *
 * Bu test STATIC GUARD: middleware.ts body size kontrolü içermek zorunda.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MIDDLEWARE_FILE = 'src/middleware.ts';

describe('Security Regression Lock — middleware body size cap', () => {
  it('middleware.ts has Content-Length size cap for /api/* mutations', async () => {
    const fullPath = join(process.cwd(), MIDDLEWARE_FILE);
    const content = await readFile(fullPath, 'utf-8');

    // Content-Length header check zorunlu
    expect(content, 'middleware must check content-length header').toMatch(/content-length/i);

    // 413 status (Payload Too Large) zorunlu
    expect(content, 'middleware must return 413 for oversized payloads').toMatch(/status:\s*413/);

    // POST/PUT/PATCH method check zorunlu (GET/DELETE body cap'e tabi değil)
    const hasMethodCheck = /method\s*===?\s*['"]POST['"][\s\S]{0,200}['"]PUT['"]/.test(content) ||
                          /\['POST',\s*'PUT',\s*'PATCH'\]/.test(content);
    expect(hasMethodCheck, 'middleware should check POST/PUT/PATCH methods for body cap').toBe(true);

    // Limit constant'ları (1MB regular, 15MB upload) — defensive numerik check
    expect(content, 'middleware should define byte limits (1024 or 1MB pattern)').toMatch(
      /1024\s*\*\s*1024|1\s*\*\s*1024\s*\*\s*1024/,
    );
  });
});
