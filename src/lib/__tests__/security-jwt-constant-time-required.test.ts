/**
 * Security Regression Lock — JWT Signature Constant-Time Compare
 *
 * 2026-04-25 audit'inde `auth.ts:decodeToken` `signature !== expectedSig` non-constant-time
 * compare kullanıyordu. Teorik timing oracle.
 *
 * CLAUDE.md HARD RULE #6: `crypto.timingSafeEqual()` zorunlu.
 *
 * Bu test STATIC GUARD: `auth.ts` veya benzer JWT-related dosyada
 * signature compare için `!==` kullanılırsa yakalanır.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const JWT_FILES_TO_CHECK = [
  'src/lib/auth.ts',
];

describe('Security Regression Lock — JWT signature constant-time compare', () => {
  for (const filePath of JWT_FILES_TO_CHECK) {
    it(`${filePath} uses crypto.timingSafeEqual for signature compare`, async () => {
      const fullPath = join(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');

      // decodeToken/verifyToken function'unun bulunduğu dosyada timingSafeEqual kullanımı zorunlu
      const hasJwtVerify = /decodeToken|verifyToken/.test(content);
      if (!hasJwtVerify) return;

      // crypto.timingSafeEqual kullanımı zorunlu
      expect(content, `${filePath} must use crypto.timingSafeEqual for signature comparison`).toMatch(
        /crypto\.timingSafeEqual\(/,
      );

      // Signature için non-constant-time `!==` kullanımı yasak
      // Pattern: `signature !== expectedSig` veya `sig !== expected`
      const insecureCompare = /\b(signature|sig)\s+!==\s+(expectedSig|expected|computed)/;
      expect(insecureCompare.test(content), `${filePath} must NOT use !== for signature compare (use timingSafeEqual)`).toBe(false);

      // Length pre-check zorunlu (timingSafeEqual farklı uzunlukta throw eder)
      expect(content, `${filePath} should pre-check signature length before timingSafeEqual`).toMatch(
        /\.length\s*!==\s*[\w.]+\.length/,
      );
    });
  }
});
