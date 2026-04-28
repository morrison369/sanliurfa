/**
 * Static lock — HARD RULE #54
 * 2FA setup verify endpoint must enforce a brute-force attempt counter.
 * Without this, an attacker can enumerate 10^6 TOTP codes within a 30s window.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('HARD RULE #54 — 2FA Setup Verify Must Have Brute-Force Protection', () => {
  it('users/2fa/verify.ts must check and increment attempt counter', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'src/pages/api/users/2fa/verify.ts'),
      'utf-8'
    );
    expect(content, 'MAX_SETUP_ATTEMPTS constant must exist').toMatch(/MAX_SETUP_ATTEMPTS/);
    expect(content, 'attempt key must be set on failure').toMatch(/setup:attempt/);
    expect(content, 'attempts >= MAX_SETUP_ATTEMPTS rate limit check must exist').toMatch(/attempts\s*>=\s*MAX_SETUP_ATTEMPTS/);
  });
});
