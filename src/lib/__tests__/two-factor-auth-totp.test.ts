/**
 * Unit Tests — two-factor-auth.ts pure crypto helpers
 *
 * Note: Bu modül `two-factor.ts`'ten ayrı (legacy 2FA library); şu anki kullanım
 * yüzeyi `two-factor.ts` (modern). Yine de exported pure helper'lar:
 * - generateTOTPSecret(): 32-char base32 secret (160-bit random)
 * - verifyTOTP(secret, token, window?): TOTP doğrulama (±window 30s pencere)
 *
 * RFC 6238 TOTP — 30 saniyelik window, SHA-1 HMAC, 6 haneli kod.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { generateTOTPSecret, verifyTOTP } from '../two-factor-auth';
import { createHmac } from 'crypto';

const FIXED_NOW = new Date('2026-05-04T12:00:00Z').getTime();

// Helper: secret + time için TOTP üretir (test fixture için)
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const result: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const index = alphabet.indexOf(encoded[i].toUpperCase());
    if (index === -1) throw new Error('Invalid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      result.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(result);
}

function generateTOTPCode(secret: string, time: number = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(Math.floor(time / 1000 / 30)), 0);
  const hmac = createHmac('sha1', base32Decode(secret));
  hmac.update(counter);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

describe('generateTOTPSecret', () => {
  it('32 karakter uzunluğunda base32 string döner', () => {
    const secret = generateTOTPSecret();
    expect(secret).toHaveLength(32);
  });

  it('sadece base32 alfabesi karakterleri (A-Z2-7)', () => {
    const secret = generateTOTPSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('iki çağrı farklı secret üretir (yüksek entropy)', () => {
    const secret1 = generateTOTPSecret();
    const secret2 = generateTOTPSecret();
    expect(secret1).not.toBe(secret2);
  });

  it('100 secret farklı (collision olmaması için)', () => {
    const secrets = new Set<string>();
    for (let i = 0; i < 100; i++) {
      secrets.add(generateTOTPSecret());
    }
    expect(secrets.size).toBe(100);
  });

  it('lowercase karakter içermez', () => {
    const secret = generateTOTPSecret();
    expect(secret).toBe(secret.toUpperCase());
  });

  it('0/1 base32 alfabe dışı karakter içermez (RFC 4648)', () => {
    const secret = generateTOTPSecret();
    expect(secret).not.toContain('0');
    expect(secret).not.toContain('1');
    expect(secret).not.toContain('8');
    expect(secret).not.toContain('9');
  });
});

describe('verifyTOTP', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('mevcut window içinde doğru kod → true', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTPCode(secret, FIXED_NOW);
    expect(verifyTOTP(secret, code)).toBe(true);
  });

  it('yanlış kod → false', () => {
    const secret = generateTOTPSecret();
    expect(verifyTOTP(secret, '000000')).toBe(false);
  });

  it('-1 window (30s önce) → true (default ±1)', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTPCode(secret, FIXED_NOW - 30 * 1000);
    expect(verifyTOTP(secret, code)).toBe(true);
  });

  it('+1 window (30s sonra) → true (default ±1)', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTPCode(secret, FIXED_NOW + 30 * 1000);
    expect(verifyTOTP(secret, code)).toBe(true);
  });

  it('±2 window dışı kod → false (default window=1)', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTPCode(secret, FIXED_NOW + 90 * 1000);
    expect(verifyTOTP(secret, code)).toBe(false);
  });

  it('window=2 ile genişletilmiş tolerans', () => {
    const secret = generateTOTPSecret();
    const code = generateTOTPCode(secret, FIXED_NOW + 60 * 1000);
    expect(verifyTOTP(secret, code, 2)).toBe(true);
  });

  it('window=0 ile sadece şu anki window kabul', () => {
    const secret = generateTOTPSecret();
    const codeNow = generateTOTPCode(secret, FIXED_NOW);
    const codePast = generateTOTPCode(secret, FIXED_NOW - 30 * 1000);
    expect(verifyTOTP(secret, codeNow, 0)).toBe(true);
    // -1 window window=0 ile reddedilir
    if (codePast !== codeNow) {
      expect(verifyTOTP(secret, codePast, 0)).toBe(false);
    }
  });

  it('5-haneli kod (padding eksik) → false', () => {
    const secret = generateTOTPSecret();
    expect(verifyTOTP(secret, '12345')).toBe(false);
  });

  it('boş string kod → false', () => {
    const secret = generateTOTPSecret();
    expect(verifyTOTP(secret, '')).toBe(false);
  });

  it('invalid base32 secret → false (try/catch)', () => {
    expect(verifyTOTP('!!!INVALID', '123456')).toBe(false);
  });

  it('farklı secret aynı kod → false (cross-secret)', () => {
    const secret1 = generateTOTPSecret();
    const secret2 = generateTOTPSecret();
    const codeForSecret1 = generateTOTPCode(secret1, FIXED_NOW);
    expect(verifyTOTP(secret2, codeForSecret1)).toBe(false);
  });
});
