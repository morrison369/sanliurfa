/**
 * Static lock — HARD RULE #50
 * Password change endpoint must revoke the current Redis session after success.
 * Without revocation, a stolen auth-token remains valid for 24h even after password change.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('HARD RULE #50 — Session Revocation After Password Change', () => {
  it('password change endpoint must import deleteCache and revoke session', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'src/pages/api/users/password.ts'),
      'utf-8'
    );
    expect(content, 'deleteCache must be imported').toMatch(/deleteCache/);
    expect(content, 'session: key must be used for revocation').toMatch(/session:/);
  });
});
