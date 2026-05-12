/**
 * Security Regression Lock — Password Reset Response Symmetry
 *
 * 2026-04-25 audit'inde `password-reset.ts:requestPasswordReset` user-not-found
 * sessizce dönüyordu (correct), ama user-exists + email-fail durumunda
 * `throw new Error(...)` atıyordu. İki farklı response: 200 OK (user yok) vs
 * 500 + error message (user var, email başarısız) → email enumeration vector.
 *
 * CLAUDE.md HARD RULE #5: Email send failure log'la, asla throw etme.
 *
 * Bu test STATIC GUARD: password-reset flow'unda email failure path'inde
 * throw kullanılmadığını doğrular.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const PASSWORD_RESET_FILE = 'src/lib/auth/password-reset.ts';

describe('Security Regression Lock — password reset response symmetry', () => {
  it('requestPasswordReset does not throw on email send failure', async () => {
    const fullPath = join(process.cwd(), PASSWORD_RESET_FILE);
    const content = await readFile(fullPath, 'utf-8');

    // requestPasswordReset function'unun bulunduğu kısmı al
    const fnStart = content.indexOf('function requestPasswordReset');
    expect(fnStart, `requestPasswordReset function not found in ${PASSWORD_RESET_FILE}`).toBeGreaterThan(-1);

    // Function body'sini ekstrakt et (next export'a kadar)
    const nextExport = content.indexOf('\nexport ', fnStart + 50);
    const fnBody = content.slice(fnStart, nextExport === -1 ? content.length : nextExport);

    // mailResult kontrolü olmalı
    expect(fnBody, 'requestPasswordReset must check mailResult.success').toMatch(
      /mailResult\.success|result\.success/,
    );

    // Email failure path'inde throw OLMAMALI
    // Pattern: `if (!mailResult.success) { throw ...}` antipattern
    const throwOnEmailFail = /if\s*\(\s*!\s*\w+\.success\s*\)\s*\{[^}]*throw\b/;
    expect(
      throwOnEmailFail.test(fnBody),
      'requestPasswordReset must NOT throw on email failure (creates email enumeration vector). Use logger.warn instead.',
    ).toBe(false);

    // Logger ile warn/log etmeli
    expect(fnBody, 'requestPasswordReset should log email failure with logger.warn').toMatch(
      /logger\.(warn|error)\b/,
    );
  });
});
