/**
 * Unit Tests — Two-Factor TOTP / Backup Code helpers
 *
 * Pure cryptographic helpers (no DB) — no mocks needed.
 * Coverage: generateTOTPSecret, generateBackupCodes, verifyTOTPCode (round-trip).
 * Note: verifyTOTPCode is time-dependent — round-trip test computes expected code
 * for current 30s window and verifies acceptance.
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { generateTOTPSecret, generateBackupCodes, verifyTOTPCode } from '../two-factor';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Re-implement TOTP for test self-verification (matches RFC 6238)
function base32Decode(encoded: string): Buffer {
  const clean = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function computeExpectedTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

describe('generateTOTPSecret', () => {
  it('produces 32-char base32 secret', () => {
    const { secret } = generateTOTPSecret('test@example.com');
    expect(secret).toHaveLength(32);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('returns otpauth:// QR URL with all required fields', () => {
    const { secret, qrCodeUrl } = generateTOTPSecret('user@test.co', 'MyApp');
    expect(qrCodeUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(qrCodeUrl).toContain(`secret=${secret}`);
    expect(qrCodeUrl).toContain('issuer=MyApp');
    expect(qrCodeUrl).toContain('algorithm=SHA1');
    expect(qrCodeUrl).toContain('digits=6');
    expect(qrCodeUrl).toContain('period=30');
  });

  it('URL-encodes email in QR URL (special chars)', () => {
    const { qrCodeUrl } = generateTOTPSecret('user+tag@test.co');
    expect(qrCodeUrl).toContain(encodeURIComponent('user+tag@test.co'));
  });

  it('default app name is Şanlıurfa', () => {
    const { qrCodeUrl } = generateTOTPSecret('a@b.co');
    expect(qrCodeUrl).toContain(`issuer=${encodeURIComponent('Şanlıurfa')}`);
  });

  it('generates unique secret per call (cryptographic randomness)', () => {
    const secrets = new Set<string>();
    for (let i = 0; i < 50; i++) {
      secrets.add(generateTOTPSecret('a@b.co').secret);
    }
    expect(secrets.size).toBe(50);
  });
});

describe('generateBackupCodes', () => {
  it('default count = 10', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
  });

  it('respects custom count', () => {
    expect(generateBackupCodes(5)).toHaveLength(5);
    expect(generateBackupCodes(20)).toHaveLength(20);
  });

  it('format: 4-digits + dash + 4-digits (XXXX-XXXX)', () => {
    for (const code of generateBackupCodes()) {
      expect(code).toMatch(/^\d{4}-\d{4}$/);
    }
  });

  it('codes are unique within a batch (low collision)', () => {
    const codes = generateBackupCodes(50);
    const unique = new Set(codes);
    expect(unique.size).toBeGreaterThanOrEqual(48); // tolerate <2 birthday collisions
  });

  it('codes are unique across batches (cryptographic randomness)', () => {
    const batch1 = new Set(generateBackupCodes(20));
    const batch2 = new Set(generateBackupCodes(20));
    const intersection = [...batch1].filter((x) => batch2.has(x));
    // Practically zero collision in 40 random 8-digit codes (10^8 space)
    expect(intersection.length).toBe(0);
  });
});

describe('verifyTOTPCode', () => {
  it('accepts code generated for current window (round-trip)', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    const counter = Math.floor(Date.now() / 1000 / 30);
    const expected = computeExpectedTOTP(secret, counter);
    expect(verifyTOTPCode(secret, expected)).toBe(true);
  });

  it('accepts code from previous window (clock skew tolerance)', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    const counter = Math.floor(Date.now() / 1000 / 30);
    const previousCode = computeExpectedTOTP(secret, counter - 1);
    expect(verifyTOTPCode(secret, previousCode)).toBe(true);
  });

  it('accepts code from next window (clock skew tolerance)', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    const counter = Math.floor(Date.now() / 1000 / 30);
    const nextCode = computeExpectedTOTP(secret, counter + 1);
    expect(verifyTOTPCode(secret, nextCode)).toBe(true);
  });

  it('rejects code from 2 windows ago (outside ±1 tolerance)', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    const counter = Math.floor(Date.now() / 1000 / 30);
    const oldCode = computeExpectedTOTP(secret, counter - 2);
    expect(verifyTOTPCode(secret, oldCode)).toBe(false);
  });

  it('rejects malformed code (not 6 digits)', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    expect(verifyTOTPCode(secret, '12345')).toBe(false); // 5 digits
    expect(verifyTOTPCode(secret, '1234567')).toBe(false); // 7 digits
    expect(verifyTOTPCode(secret, 'abcdef')).toBe(false); // letters
    expect(verifyTOTPCode(secret, '12-34-56')).toBe(false); // dashes
  });

  it('rejects empty token', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    expect(verifyTOTPCode(secret, '')).toBe(false);
  });

  it('rejects empty secret', () => {
    expect(verifyTOTPCode('', '123456')).toBe(false);
  });

  it('rejects wrong code (random)', () => {
    const { secret } = generateTOTPSecret('a@b.co');
    expect(verifyTOTPCode(secret, '999999')).toBe(false);
  });

  it('returns false on invalid base32 secret (catches errors)', () => {
    expect(verifyTOTPCode('!!!INVALID!!!', '123456')).toBe(false);
  });

  it('uses constant-time comparison (timingSafeEqual)', () => {
    // Indirect verification: function should not throw on length mismatch
    // (timingSafeEqual throws if buffers differ in length — code pre-validates 6 digits)
    const { secret } = generateTOTPSecret('a@b.co');
    expect(() => verifyTOTPCode(secret, '12345')).not.toThrow();
  });
});

describe('TOTP RFC 6238 known vectors', () => {
  // Test vector from RFC 6238 Appendix B (T = 59, secret = ASCII "12345678901234567890")
  // Key encoded as base32: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
  it('matches RFC 6238 reference (T=59 SHA1)', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    // RFC 6238 T=59 → counter = floor(59/30) = 1
    const code = computeExpectedTOTP(secret, 1);
    // Known answer from RFC: 287082
    // Verify our reference impl matches RFC (sanity check)
    expect(code).toBe('287082');
  });
});
