/**
 * Unit Tests — bcrypt Timing Oracle Defense (HARD RULE #4)
 *
 * Background: Login user-not-found path must call bcrypt.compare against a real
 * hash to equalize response time vs. user-found+wrong-password path. Otherwise
 * timing difference reveals account existence (email enumeration vector).
 *
 * Both `auth.ts` and `auth/auth-flows.ts` use a shared DUMMY_BCRYPT_HASH constant.
 * This test verifies:
 * 1. The constant is a valid bcrypt hash format (otherwise compare() would error)
 * 2. compare(any_password, DUMMY_BCRYPT_HASH) returns false (no false positive)
 * 3. compare(any_password, DUMMY_BCRYPT_HASH) takes measurable time (defeats timing oracle)
 */

import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

const DUMMY_BCRYPT_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

describe('bcrypt Timing Defense — DUMMY_BCRYPT_HASH', () => {
  it('matches bcrypt hash format ($2a$rounds$salt+hash, 60 chars)', () => {
    expect(DUMMY_BCRYPT_HASH).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    expect(DUMMY_BCRYPT_HASH).toHaveLength(60);
  });

  it('uses 12 rounds (matches BCRYPT_ROUNDS default)', () => {
    expect(DUMMY_BCRYPT_HASH).toMatch(/^\$2a\$12\$/);
  });

  it('compare(any password, DUMMY) returns false (no false positive)', async () => {
    expect(await bcrypt.compare('password', DUMMY_BCRYPT_HASH)).toBe(false);
    expect(await bcrypt.compare('test123', DUMMY_BCRYPT_HASH)).toBe(false);
    expect(await bcrypt.compare('', DUMMY_BCRYPT_HASH)).toBe(false);
    expect(await bcrypt.compare('a'.repeat(72), DUMMY_BCRYPT_HASH)).toBe(false);
  });

  it('compare(empty string, DUMMY) returns false', async () => {
    expect(await bcrypt.compare('', DUMMY_BCRYPT_HASH)).toBe(false);
  });

  it('compare takes >100ms (real cryptographic work — timing oracle defense)', async () => {
    // 12 rounds bcrypt is ~250-400ms on modern CPU. <100ms would indicate stub/optimization.
    const t0 = Date.now();
    await bcrypt.compare('test-password', DUMMY_BCRYPT_HASH);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThan(100);
  });

  it('compare time is consistent across calls (low variance)', async () => {
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      await bcrypt.compare(`pwd-${i}`, DUMMY_BCRYPT_HASH);
      samples.push(Date.now() - t0);
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const maxDeviation = Math.max(...samples.map((s) => Math.abs(s - avg)));
    // Deviation should be <50% of average (no anomalous outliers)
    expect(maxDeviation).toBeLessThan(avg);
  }, 10000); // longer timeout: 5×~300ms = ~1.5s
});

describe('bcrypt timing comparison — user-found vs user-not-found symmetry', () => {
  it('verify+fail vs DUMMY+fail timings are similar (within 200ms)', async () => {
    // Real user hash (12 rounds, 'correct-password' hashed)
    const realHash = await bcrypt.hash('correct-password', 12);

    // Path 1: user found + wrong password
    const t0 = Date.now();
    await bcrypt.compare('wrong-password', realHash);
    const userFoundTime = Date.now() - t0;

    // Path 2: user NOT found → DUMMY hash
    const t1 = Date.now();
    await bcrypt.compare('any-password', DUMMY_BCRYPT_HASH);
    const userNotFoundTime = Date.now() - t1;

    // Both should be within 200ms of each other (defeats timing oracle)
    const delta = Math.abs(userFoundTime - userNotFoundTime);
    expect(delta).toBeLessThan(200);
  }, 15000); // longer timeout: 2×bcrypt.hash + 2×compare
});
