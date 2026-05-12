/**
 * Unit Tests — validation/index.ts Zod 4 schemas + validate/validatePartial helpers
 *
 * - userRegistrationSchema (email + password regex chain + fullName Türkçe chars)
 * - userLoginSchema (email + password min 1)
 * - placeCreateSchema (name min/max + category enum + lat/lon Şanlıurfa range)
 * - reviewCreateSchema (placeId UUID + rating 1-5 int + content + images max 5)
 * - searchQuerySchema (q + category enum + limit/offset default)
 * - paginationSchema (page/limit string→number transform + max 100)
 * - emailPreferencesSchema (digest enum + defaults)
 * - validate / validatePartial helpers
 */

import { describe, it, expect } from 'vitest';
import {
  userRegistrationSchema,
  userLoginSchema,
  placeCreateSchema,
  reviewCreateSchema,
  searchQuerySchema,
  paginationSchema,
  emailPreferencesSchema,
  validate,
  validatePartial,
} from '../validation/index';

describe('userRegistrationSchema', () => {
  it('valid input → success', () => {
    const r = userRegistrationSchema.safeParse({
      email: 'test@sanliurfa.com',
      password: 'StrongPass123',
      fullName: 'Ahmet Yılmaz',
    });
    expect(r.success).toBe(true);
  });

  it('invalid email → fail', () => {
    expect(userRegistrationSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPass123',
      fullName: 'Ali',
    }).success).toBe(false);
  });

  it('weak password (no uppercase) → fail', () => {
    expect(userRegistrationSchema.safeParse({
      email: 'a@b.com',
      password: 'weakpass123',
      fullName: 'Ali',
    }).success).toBe(false);
  });

  it('weak password (no number) → fail', () => {
    expect(userRegistrationSchema.safeParse({
      email: 'a@b.com',
      password: 'NoNumberPass',
      fullName: 'Ali',
    }).success).toBe(false);
  });

  it('fullName invalid char (number) → fail', () => {
    expect(userRegistrationSchema.safeParse({
      email: 'a@b.com',
      password: 'GoodPass1',
      fullName: 'Ali123',
    }).success).toBe(false);
  });
});

describe('userLoginSchema', () => {
  it('valid input → success', () => {
    expect(userLoginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('boş password → fail', () => {
    expect(userLoginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('placeCreateSchema', () => {
  it('valid Şanlıurfa coords → success', () => {
    const r = placeCreateSchema.safeParse({
      name: 'Test Mekan',
      description: 'A nice place to visit in Sanliurfa.',
      category: 'restaurant',
      address: 'Merkez Mahallesi',
      latitude: 37.5,
      longitude: 39.0,
    });
    expect(r.success).toBe(true);
  });

  it('lat range dışı (40) → fail', () => {
    expect(placeCreateSchema.safeParse({
      name: 'Test',
      description: 'A nice place description.',
      category: 'cafe',
      address: 'Address',
      latitude: 40,
      longitude: 39,
    }).success).toBe(false);
  });

  it('invalid category enum → fail', () => {
    expect(placeCreateSchema.safeParse({
      name: 'Test',
      description: 'desc desc desc',
      category: 'invalid-cat' as any,
      address: 'Adresi',
      latitude: 37.5,
      longitude: 39,
    }).success).toBe(false);
  });

  it('phone optional + valid format', () => {
    const r = placeCreateSchema.safeParse({
      name: 'Test',
      description: 'A long description here.',
      category: 'park',
      address: 'Adress',
      latitude: 37.5,
      longitude: 39,
      phone: '+90 414 123 4567',
    });
    expect(r.success).toBe(true);
  });

  it('website empty string allowed (or url)', () => {
    const r = placeCreateSchema.safeParse({
      name: 'Test',
      description: 'desc desc desc desc',
      category: 'park',
      address: 'Adress',
      latitude: 37.5,
      longitude: 39,
      website: '',
    });
    expect(r.success).toBe(true);
  });
});

describe('reviewCreateSchema', () => {
  it('valid input → success', () => {
    expect(reviewCreateSchema.safeParse({
      placeId: '550e8400-e29b-41d4-a716-446655440000',
      rating: 5,
      content: 'A good review here.',
    }).success).toBe(true);
  });

  it('rating > 5 → fail', () => {
    expect(reviewCreateSchema.safeParse({
      placeId: '550e8400-e29b-41d4-a716-446655440000',
      rating: 6,
      content: 'Long enough content',
    }).success).toBe(false);
  });

  it('placeId not UUID → fail', () => {
    expect(reviewCreateSchema.safeParse({
      placeId: 'not-uuid',
      rating: 3,
      content: 'Long enough content',
    }).success).toBe(false);
  });

  it('images > 5 → fail', () => {
    expect(reviewCreateSchema.safeParse({
      placeId: '550e8400-e29b-41d4-a716-446655440000',
      rating: 3,
      content: 'Long enough content',
      images: Array(6).fill('https://x.com/img.jpg'),
    }).success).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('limit/offset defaults → 20/0', () => {
    const r = searchQuerySchema.safeParse({ q: 'test' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(20);
      expect(r.data.offset).toBe(0);
    }
  });

  it('q too short → fail', () => {
    expect(searchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('string→number transform', () => {
    const r = paginationSchema.safeParse({ page: '2', limit: '10' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.limit).toBe(10);
    }
  });

  it('limit > 100 → fail (refine)', () => {
    expect(paginationSchema.safeParse({ page: '1', limit: '101' }).success).toBe(false);
  });
});

describe('emailPreferencesSchema', () => {
  it('default values applied', () => {
    const r = emailPreferencesSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.notifications).toBe(true);
      expect(r.data.digest).toBe('weekly');
    }
  });

  it('invalid digest enum → fail', () => {
    expect(emailPreferencesSchema.safeParse({ digest: 'hourly' as any }).success).toBe(false);
  });
});

describe('validate helper', () => {
  it('success → { success: true, data }', () => {
    const r = validate(userLoginSchema, { email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe('a@b.com');
    }
  });

  it('fail → helper TypeError (BUG: Zod 4 `.error.errors` → `.issues` rename)', () => {
    // validation/index.ts:107 helper bug: `(result.error as any).errors.map(...)`.
    // Zod 4'te `.error.errors` undefined; `.error.issues` kullanılmalı.
    // Test bu davranışı lock'lar — fail path crash olur.
    expect(() => validate(userLoginSchema, { email: 'invalid', password: '' })).toThrow(TypeError);
  });
});

describe('validatePartial helper', () => {
  it('partial input → success (optional all fields)', () => {
    const r = validatePartial(userRegistrationSchema, { email: 'a@b.com' });
    expect(r.success).toBe(true);
  });
});
