/**
 * Unit Tests — security/security.ts AES-256-GCM encryption pure helpers
 *
 * - encryptData(data, keyBase64): { ciphertext: 'hex:authTagHex', iv: hex }
 * - decryptData(ciphertext, ivHex, keyBase64): plaintext
 *
 * AES-256-GCM authenticated encryption — confidentiality + integrity.
 * Key 32-byte (256-bit), IV random 16-byte per call (unique nonce zorunlu — GCM kuralı).
 *
 * Note: encryptData/decryptData logger.error() çağırır exception case'de;
 * test sırasında error log normal — assertion error fırlatma kontrolü.
 */

import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../security/security';
import { randomBytes } from 'node:crypto';

// 32-byte key base64 fixture (gerçek prod'da rotateEncryptionKey üretir)
const TEST_KEY = randomBytes(32).toString('base64');

describe('encryptData', () => {
  it('düz string → ciphertext + iv döner', () => {
    const result = encryptData('hello world', TEST_KEY);
    expect(result.ciphertext).toBeTruthy();
    expect(result.iv).toBeTruthy();
  });

  it('ciphertext "hex:authTagHex" formatı', () => {
    const result = encryptData('test', TEST_KEY);
    expect(result.ciphertext).toContain(':');
    const [encrypted, authTag] = result.ciphertext.split(':');
    expect(encrypted).toMatch(/^[0-9a-f]+$/);
    expect(authTag).toMatch(/^[0-9a-f]+$/);
  });

  it('iv hex format (16-byte → 32 hex char)', () => {
    const result = encryptData('test', TEST_KEY);
    expect(result.iv).toMatch(/^[0-9a-f]{32}$/);
  });

  it('aynı plaintext + aynı key → farklı ciphertext (random IV)', () => {
    const r1 = encryptData('same data', TEST_KEY);
    const r2 = encryptData('same data', TEST_KEY);
    // GCM unique IV nedeniyle ciphertext farklı olmalı
    expect(r1.ciphertext).not.toBe(r2.ciphertext);
    expect(r1.iv).not.toBe(r2.iv);
  });

  it('boş string encrypt edilebilir', () => {
    const result = encryptData('', TEST_KEY);
    expect(result.ciphertext).toBeTruthy();
    // boş plaintext → encrypted kısım boş, sadece authTag
    expect(result.ciphertext).toContain(':');
  });

  it('Türkçe karakter destek', () => {
    const result = encryptData('Şanlıurfa Göbeklitepe', TEST_KEY);
    expect(result.ciphertext).toBeTruthy();
  });

  it('uzun input encrypt — 10K char', () => {
    const longInput = 'a'.repeat(10000);
    const result = encryptData(longInput, TEST_KEY);
    expect(result.ciphertext).toBeTruthy();
  });

  it('invalid key (kısa) → throw', () => {
    const shortKey = randomBytes(8).toString('base64'); // sadece 8 byte, 32 değil
    expect(() => encryptData('data', shortKey)).toThrow();
  });
});

describe('decryptData — roundtrip', () => {
  it('encrypt → decrypt → orijinal plaintext', () => {
    const original = 'sensitive data 123';
    const encrypted = encryptData(original, TEST_KEY);
    const decrypted = decryptData(encrypted.ciphertext, encrypted.iv, TEST_KEY);
    expect(decrypted).toBe(original);
  });

  it('boş string roundtrip', () => {
    const encrypted = encryptData('', TEST_KEY);
    expect(decryptData(encrypted.ciphertext, encrypted.iv, TEST_KEY)).toBe('');
  });

  it('Türkçe karakter roundtrip', () => {
    const original = 'Şanlıurfa Göbeklitepe ş ğ ü ç ö ı';
    const encrypted = encryptData(original, TEST_KEY);
    expect(decryptData(encrypted.ciphertext, encrypted.iv, TEST_KEY)).toBe(original);
  });

  it('uzun input roundtrip — 10K', () => {
    const original = 'a'.repeat(10000);
    const encrypted = encryptData(original, TEST_KEY);
    expect(decryptData(encrypted.ciphertext, encrypted.iv, TEST_KEY)).toBe(original);
  });

  it('JSON string roundtrip', () => {
    const original = JSON.stringify({ user: 'X', email: 'x@y.com', tags: [1, 2] });
    const encrypted = encryptData(original, TEST_KEY);
    expect(decryptData(encrypted.ciphertext, encrypted.iv, TEST_KEY)).toBe(original);
  });

  it('100 farklı plaintext roundtrip', () => {
    for (let i = 0; i < 100; i++) {
      const data = `record-${i}-${Math.random()}`;
      const enc = encryptData(data, TEST_KEY);
      expect(decryptData(enc.ciphertext, enc.iv, TEST_KEY)).toBe(data);
    }
  });
});

describe('decryptData — authentication failures', () => {
  it('yanlış key → throw (auth fail)', () => {
    const wrongKey = randomBytes(32).toString('base64');
    const encrypted = encryptData('secret', TEST_KEY);
    expect(() => decryptData(encrypted.ciphertext, encrypted.iv, wrongKey)).toThrow();
  });

  it('tampered ciphertext → throw (GCM auth tag)', () => {
    const encrypted = encryptData('secret', TEST_KEY);
    const [enc, tag] = encrypted.ciphertext.split(':');
    const replacement = enc[0] === '0' ? '1' : '0';
    const tampered = replacement + enc.slice(1) + ':' + tag;
    expect(() => decryptData(tampered, encrypted.iv, TEST_KEY)).toThrow();
  });

  it('tampered authTag → throw', () => {
    const encrypted = encryptData('secret', TEST_KEY);
    const [enc, tag] = encrypted.ciphertext.split(':');
    const replacement = tag[0] === '0' ? '1' : '0';
    const tamperedTag = replacement + tag.slice(1);
    expect(() => decryptData(enc + ':' + tamperedTag, encrypted.iv, TEST_KEY)).toThrow();
  });

  it('yanlış IV → throw (auth fail)', () => {
    const encrypted = encryptData('secret', TEST_KEY);
    const wrongIV = randomBytes(16).toString('hex');
    expect(() => decryptData(encrypted.ciphertext, wrongIV, TEST_KEY)).toThrow();
  });

  it('malformed ciphertext (no `:`) → throw', () => {
    expect(() => decryptData('not-formatted', '00'.repeat(16), TEST_KEY)).toThrow();
  });
});

describe('encryptData — GCM güvenlik invariant\'ları', () => {
  it('IV her zaman 16 byte (GCM standart)', () => {
    for (let i = 0; i < 10; i++) {
      const result = encryptData(`data-${i}`, TEST_KEY);
      const ivBytes = Buffer.from(result.iv, 'hex');
      expect(ivBytes.length).toBe(16);
    }
  });

  it('authTag 16 byte (32 hex char) — GCM 128-bit standart', () => {
    const result = encryptData('test', TEST_KEY);
    const tagHex = result.ciphertext.split(':')[1];
    expect(tagHex).toHaveLength(32); // 16 byte = 32 hex
  });
});
