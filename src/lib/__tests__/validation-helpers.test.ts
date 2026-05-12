/**
 * Unit Tests — validation.ts
 *
 * - validateEmail (RFC-lite + 254 char limit)
 * - validatePassword (min 8 + uppercase + lowercase + digit + special)
 * - validateString (length + pattern)
 * - validateNumber (NaN guard + min/max range)
 * - validateWithSchema (type + required + min/max + pattern + custom + sanitize)
 * - commonSchemas (login/register/review/place)
 *
 * Note: validation.ts `sanitize: true` flag verildiğinde `sanitizeInput` (api.ts)
 * çağırır — bu test dosyasında sanitize flag denenmez (ayrı api-validators-input
 * dosyasında kapsanır).
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateString,
  validateNumber,
  validateWithSchema,
  commonSchemas,
} from '../validation';

describe('validateEmail', () => {
  it('geçerli email → true', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('a.b.c@x.co.uk')).toBe(true);
    expect(validateEmail('user+tag@gmail.com')).toBe(true);
  });

  it('@ yok → false', () => {
    expect(validateEmail('plainaddress')).toBe(false);
  });

  it('domain yok → false', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('TLD yok → false', () => {
    expect(validateEmail('test@example')).toBe(false);
  });

  it('boşluk içeriyor → false', () => {
    expect(validateEmail('test @example.com')).toBe(false);
    expect(validateEmail('test@ex ample.com')).toBe(false);
  });

  it('non-string → false', () => {
    expect(validateEmail(123)).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail({})).toBe(false);
  });

  it('254 karakterden uzun → false (RFC 5321)', () => {
    const long = 'a'.repeat(245) + '@x.com'; // 251 chars OK
    expect(validateEmail(long)).toBe(true);
    const tooLong = 'a'.repeat(250) + '@x.com'; // 256 chars FAIL
    expect(validateEmail(tooLong)).toBe(false);
  });

  it('boş string → false', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('güçlü password → valid:true, errors:[]', () => {
    const result = validatePassword('Str0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('non-string → valid:false', () => {
    const result = validatePassword(12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be a string');
  });

  it('< 8 char → "Minimum 8 characters required" error', () => {
    const result = validatePassword('Aa1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Minimum 8'))).toBe(true);
  });

  it('uppercase yok → uppercase error', () => {
    const result = validatePassword('weak1pass!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
  });

  it('lowercase yok → lowercase error', () => {
    const result = validatePassword('WEAK1PASS!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('lowercase'))).toBe(true);
  });

  it('digit yok → number error', () => {
    const result = validatePassword('NoNumber!Pass');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('number'))).toBe(true);
  });

  it('special char yok → special char error', () => {
    const result = validatePassword('Weak1Password');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('special'))).toBe(true);
  });

  it('birden fazla error toplanır', () => {
    const result = validatePassword('weak'); // < 8 + no upper + no digit + no special
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('tüm kabul edilebilir special char varyantları', () => {
    expect(validatePassword('Test1!').valid).toBe(false); // < 8
    expect(validatePassword('TestPas1!').valid).toBe(true);
    expect(validatePassword('TestPas1@').valid).toBe(true);
    expect(validatePassword('TestPas1#').valid).toBe(true);
    expect(validatePassword('TestPas1$').valid).toBe(true);
  });
});

describe('validateString', () => {
  it('default (1-255 char) — geçerli string', () => {
    expect(validateString('hello')).toBe(true);
  });

  it('boş string → false (default min 1)', () => {
    expect(validateString('')).toBe(false);
  });

  it('255+ char → false (default max)', () => {
    expect(validateString('a'.repeat(256))).toBe(false);
  });

  it('non-string → false', () => {
    expect(validateString(123)).toBe(false);
    expect(validateString(null)).toBe(false);
  });

  it('custom min/max', () => {
    expect(validateString('abc', 5, 10)).toBe(false); // < min
    expect(validateString('abcdef', 5, 10)).toBe(true);
    expect(validateString('abcdefghijk', 5, 10)).toBe(false); // > max
  });

  it('RegExp pattern enforce', () => {
    expect(validateString('abc123', 1, 100, /^[a-z]+\d+$/)).toBe(true);
    expect(validateString('ABC123', 1, 100, /^[a-z]+\d+$/)).toBe(false);
  });

  it('string pattern (string → RegExp)', () => {
    expect(validateString('abc', 1, 10, '^[a-z]+$')).toBe(true);
    expect(validateString('123', 1, 10, '^[a-z]+$')).toBe(false);
  });
});

describe('validateNumber', () => {
  it('düz number → true', () => {
    expect(validateNumber(42)).toBe(true);
    expect(validateNumber(0)).toBe(true);
    expect(validateNumber(-5)).toBe(true);
  });

  it('NaN → false', () => {
    expect(validateNumber(NaN)).toBe(false);
  });

  it('non-number → false', () => {
    expect(validateNumber('42')).toBe(false);
    expect(validateNumber(null)).toBe(false);
    expect(validateNumber(undefined)).toBe(false);
    expect(validateNumber(true)).toBe(false);
  });

  it('min boundary', () => {
    expect(validateNumber(5, 10)).toBe(false);
    expect(validateNumber(10, 10)).toBe(true);
    expect(validateNumber(15, 10)).toBe(true);
  });

  it('max boundary', () => {
    expect(validateNumber(15, 0, 10)).toBe(false);
    expect(validateNumber(10, 0, 10)).toBe(true);
    expect(validateNumber(5, 0, 10)).toBe(true);
  });

  it('range guard min+max', () => {
    expect(validateNumber(50, 1, 100)).toBe(true);
    expect(validateNumber(0, 1, 100)).toBe(false);
    expect(validateNumber(101, 1, 100)).toBe(false);
  });
});

describe('validateWithSchema', () => {
  it('valid email + string → success', () => {
    const result = validateWithSchema(
      { email: 'a@b.com', name: 'X' },
      {
        email: { type: 'email', required: true },
        name: { type: 'string', required: true },
      },
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.email).toBe('a@b.com');
    }
  });

  it('required field eksik → error', () => {
    const result = validateWithSchema(
      {},
      { email: { type: 'email', required: true } },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.email).toContain('required');
    }
  });

  it('optional field boş → skip (data\'ya eklenmez)', () => {
    const result = validateWithSchema(
      { email: 'a@b.com' },
      {
        email: { type: 'email', required: true },
        bio: { type: 'string', required: false },
      },
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.bio).toBeUndefined();
    }
  });

  it('invalid email → error message', () => {
    const result = validateWithSchema(
      { email: 'not-an-email' },
      { email: { type: 'email', required: true } },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.email).toContain('Invalid email');
    }
  });

  it('string min/max ihlal', () => {
    const result = validateWithSchema(
      { name: 'X' },
      { name: { type: 'string', required: true, minLength: 3, maxLength: 10 } },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.name).toContain('Invalid string');
    }
  });

  it('number range ihlal', () => {
    const result = validateWithSchema(
      { rating: 10 },
      { rating: { type: 'number', required: true, min: 1, max: 5 } },
    );
    expect(result.valid).toBe(false);
  });

  it('boolean type — true/false geçer', () => {
    const result = validateWithSchema(
      { active: true },
      { active: { type: 'boolean', required: true } },
    );
    expect(result.valid).toBe(true);
  });

  it('boolean type — string verirse error', () => {
    const result = validateWithSchema(
      { active: 'true' },
      { active: { type: 'boolean', required: true } },
    );
    expect(result.valid).toBe(false);
  });

  it('array type — array geçer', () => {
    const result = validateWithSchema(
      { tags: ['a', 'b'] },
      { tags: { type: 'array', required: true } },
    );
    expect(result.valid).toBe(true);
  });

  it('array type — array değil → error', () => {
    const result = validateWithSchema(
      { tags: 'not-array' },
      { tags: { type: 'array', required: true } },
    );
    expect(result.valid).toBe(false);
  });

  it('custom validator true → geçer', () => {
    const result = validateWithSchema(
      { code: 'ABC' },
      {
        code: {
          type: 'string',
          required: true,
          custom: (v) => (v === 'ABC' ? true : 'must be ABC'),
        },
      },
    );
    expect(result.valid).toBe(true);
  });

  it('custom validator false → "Validation failed"', () => {
    const result = validateWithSchema(
      { code: 'XYZ' },
      {
        code: {
          type: 'string',
          required: true,
          custom: () => false,
        },
      },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.code).toBe('Validation failed');
    }
  });

  it('custom validator string → custom error message', () => {
    const result = validateWithSchema(
      { age: 5 },
      {
        age: {
          type: 'number',
          required: true,
          custom: (v) => (v < 18 ? 'Must be 18+' : true),
        },
      },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.age).toBe('Must be 18+');
    }
  });

  it('multiple field error toplanır', () => {
    const result = validateWithSchema(
      { email: 'bad', age: -1 },
      {
        email: { type: 'email', required: true },
        age: { type: 'number', required: true, min: 0 },
      },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(Object.keys(result.errors)).toHaveLength(2);
    }
  });
});

describe('commonSchemas', () => {
  it('login schema — email + password required', () => {
    expect(commonSchemas.login.email.required).toBe(true);
    expect(commonSchemas.login.password.required).toBe(true);
  });

  it('register schema — email + password (min 8) + full_name (sanitize)', () => {
    expect(commonSchemas.register.password.minLength).toBe(8);
    expect(commonSchemas.register.full_name.sanitize).toBe(true);
  });

  it('review schema — rating min 1 max 5', () => {
    expect(commonSchemas.review.rating.min).toBe(1);
    expect(commonSchemas.review.rating.max).toBe(5);
  });

  it('review schema — content min 10 max 1000 + sanitize', () => {
    expect(commonSchemas.review.content.minLength).toBe(10);
    expect(commonSchemas.review.content.maxLength).toBe(1000);
    expect(commonSchemas.review.content.sanitize).toBe(true);
  });

  it('place schema — name + description + category + address required', () => {
    expect(commonSchemas.place.name.required).toBe(true);
    expect(commonSchemas.place.description.required).toBe(true);
    expect(commonSchemas.place.category.required).toBe(true);
    expect(commonSchemas.place.address.required).toBe(true);
  });

  it('register schema validateWithSchema ile pratik kullanım', () => {
    const result = validateWithSchema(
      { email: 'a@b.com', password: 'Str0ng!Pa', full_name: 'Ali Veli' },
      commonSchemas.register,
    );
    expect(result.valid).toBe(true);
  });

  it('review schema rating > 5 → error', () => {
    const result = validateWithSchema(
      { placeId: 'p1', rating: 6, content: 'a'.repeat(20) },
      commonSchemas.review,
    );
    expect(result.valid).toBe(false);
  });
});
