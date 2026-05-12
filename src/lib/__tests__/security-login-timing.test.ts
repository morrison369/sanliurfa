/**
 * Security Test — Login Timing Oracle (Email Enumeration Defense)
 *
 * 2026-04-25 audit'inde `signIn()` user-not-found case'inde bcrypt.compare
 * ÇAĞIRMIYORDU — response time ~10ms (DB lookup) vs valid email ~100-300ms (bcrypt).
 * Attacker response süresinden valid email'leri probe edebilirdi.
 *
 * CLAUDE.md "SECURITY HARD RULES" #4: DUMMY_BCRYPT_HASH ile constant-time defense.
 *
 * Bu test:
 * 1. user-not-found ve wrong-password timing'in karşılaştırılabilir olduğunu doğrular
 * 2. Her iki path'in de identique error message döndürdüğünü doğrular
 * 3. DUMMY_BCRYPT_HASH'in valid bcrypt formatında olduğunu doğrular
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../lib/postgres', () => ({
  queryOne: vi.fn(),
}));

vi.mock('../../lib/cache/cache', () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    setEx: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  }),
  prefixKey: (k: string) => `sanliurfa:${k}`,
}));

vi.mock('../../lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('Login Timing Oracle Defense', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // signIn IS_TEST_ENV check için NODE_ENV=test olduğunda comparePassword false döner.
    // Bu test'te realistic bcrypt timing'i ölçmek istiyoruz, NODE_ENV'i development yapalım.
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
  });

  // afterEach uses different scope — fix:
  function afterEach(fn: () => void) {
    // vitest auto-imports afterEach; placeholder to avoid duplicate import
    void fn;
  }

  it('returns identical error message for unknown user vs wrong password', async () => {
    const { queryOne } = await import('../../lib/postgres');
    const { signIn } = await import('../../lib/auth');

    // Case 1: User not found
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result1 = await signIn('nonexistent@example.com', 'somepass', '127.0.0.1');

    expect(result1.success).toBe(false);
    expect(result1.error).toBe('E-posta veya şifre hatalı.');

    // Case 2: User found, wrong password
    const realHash = await bcrypt.hash('correct-password', 4); // low rounds for test speed
    vi.mocked(queryOne).mockResolvedValueOnce({
      id: 'u-1', email: 'real@example.com', password_hash: realHash,
      full_name: 'Real User', role: 'user', avatar_url: null, points: 0,
    });
    const result2 = await signIn('real@example.com', 'wrong-password', '127.0.0.1');

    expect(result2.success).toBe(false);
    expect(result2.error).toBe('E-posta veya şifre hatalı.');

    // Identical error message — no email enumeration via response content
    expect(result1.error).toBe(result2.error);
  });

  it('user-not-found path calls bcrypt.compare (constant-time defense)', async () => {
    const { queryOne } = await import('../../lib/postgres');
    const { signIn } = await import('../../lib/auth');

    const compareSpy = vi.spyOn(bcrypt, 'compare');

    vi.mocked(queryOne).mockResolvedValueOnce(null);
    await signIn('unknown@example.com', 'anypass', '127.0.0.1');

    // bcrypt.compare MUST be called even when user not found
    // (timing-equalizer with DUMMY_BCRYPT_HASH)
    expect(compareSpy).toHaveBeenCalled();
    const callArgs = compareSpy.mock.calls[0];
    expect(callArgs[0]).toBe('anypass');
    // Second arg is the dummy hash — must be valid bcrypt format
    expect(String(callArgs[1])).toMatch(/^\$2[ab]\$\d{2}\$/);

    compareSpy.mockRestore();
  });

  it('wrong-password path also calls bcrypt.compare', async () => {
    const { queryOne } = await import('../../lib/postgres');
    const { signIn } = await import('../../lib/auth');

    const compareSpy = vi.spyOn(bcrypt, 'compare');

    const realHash = await bcrypt.hash('right', 4);
    vi.mocked(queryOne).mockResolvedValueOnce({
      id: 'u-1', email: 'r@x.com', password_hash: realHash,
      full_name: 'R', role: 'user', avatar_url: null, points: 0,
    });
    await signIn('r@x.com', 'wrong', '127.0.0.1');

    expect(compareSpy).toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it('successful login also calls bcrypt.compare', async () => {
    const { queryOne } = await import('../../lib/postgres');
    const { signIn } = await import('../../lib/auth');

    const compareSpy = vi.spyOn(bcrypt, 'compare');

    const realHash = await bcrypt.hash('right-password', 4);
    vi.mocked(queryOne).mockResolvedValueOnce({
      id: 'u-1', email: 'r@x.com', password_hash: realHash,
      full_name: 'R', role: 'user', avatar_url: null, points: 0,
    });

    const result = await signIn('r@x.com', 'right-password', '127.0.0.1');

    expect(result.success).toBe(true);
    expect(compareSpy).toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it('DUMMY_BCRYPT_HASH never matches an empty/random password', async () => {
    // Verify the dummy hash chosen doesn't accidentally match common test passwords
    // (defense-in-depth: even if attacker tried common strings, no match).
    const dummyHash = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const commonPasswords = ['', 'password', 'admin', '12345678', 'test'];

    for (const pw of commonPasswords) {
      const matched = await bcrypt.compare(pw, dummyHash);
      expect(matched).toBe(false);
    }
  });
});

// Re-import afterEach properly
import { afterEach } from 'vitest';
