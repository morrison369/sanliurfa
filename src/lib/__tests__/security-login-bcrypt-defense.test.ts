/**
 * Security Regression Lock — Login bcrypt Constant-Time Defense
 *
 * 2026-04-25 audit'inde `auth.ts:signIn` ve `auth/auth-flows.ts:loginFlow`
 * user-not-found case'inde bcrypt.compare ÇAĞIRMIYORDU. Email enumeration
 * via response time (10ms vs 100-300ms).
 *
 * CLAUDE.md HARD RULE #4: DUMMY_BCRYPT_HASH ile constant-time defense zorunlu.
 *
 * Bu test STATIC GUARD: login flow dosyalarında DUMMY_BCRYPT_HASH constant
 * tanımı + user-not-found path'inde bcrypt.compare kullanımı zorunlu.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const LOGIN_FILES = [
  'src/lib/auth.ts',
  'src/lib/auth/auth-flows.ts',
];

describe('Security Regression Lock — login bcrypt timing defense', () => {
  for (const filePath of LOGIN_FILES) {
    it(`${filePath} defines DUMMY_BCRYPT_HASH constant`, async () => {
      const fullPath = join(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');

      const hasLoginFlow = /signIn|loginFlow|runLoginFlow/.test(content);
      if (!hasLoginFlow) return;

      // DUMMY_BCRYPT_HASH constant tanımı zorunlu
      expect(content, `${filePath} must define DUMMY_BCRYPT_HASH constant for timing defense`).toMatch(
        /DUMMY_BCRYPT_HASH\s*=\s*['"`]\$2[ab]\$\d{2}\$/,
      );

      // bcrypt.compare DUMMY ile çağrılmalı (user-not-found path)
      expect(content, `${filePath} must call bcrypt.compare(_, DUMMY_BCRYPT_HASH) in user-not-found path`).toMatch(
        /(?:bcrypt\.compare|comparePassword)\([^,]+,\s*DUMMY_BCRYPT_HASH\s*\)/,
      );
    });
  }
});
