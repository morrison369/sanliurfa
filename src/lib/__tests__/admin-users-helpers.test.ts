/**
 * Unit Tests — admin/admin-users.ts pure helpers + achievements/achievements.ts constants
 *
 * - normalizeAdminUserStatusAction(action): user status action whitelist enforcement
 * - ACHIEVEMENT_CHECKS: achievement key registry (15 achievement)
 *
 * Note: updateAdminUserStatus / checkCommonAchievements DB-bound, sadece bu pure
 * helper'lar test edilir.
 */

import { describe, it, expect } from 'vitest';
import { normalizeAdminUserStatusAction } from '../admin/admin-users';
import { ACHIEVEMENT_CHECKS } from '../achievements/achievements';

describe('normalizeAdminUserStatusAction', () => {
  it('"activate" → "activate"', () => {
    expect(normalizeAdminUserStatusAction('activate')).toBe('activate');
  });

  it('"suspend" → "suspend"', () => {
    expect(normalizeAdminUserStatusAction('suspend')).toBe('suspend');
  });

  it('"delete" → "delete"', () => {
    expect(normalizeAdminUserStatusAction('delete')).toBe('delete');
  });

  it('bilinmeyen action → throw "Geçersiz kullanıcı işlemi."', () => {
    expect(() => normalizeAdminUserStatusAction('unknown')).toThrow('Geçersiz kullanıcı işlemi.');
  });

  it('boş string → throw', () => {
    expect(() => normalizeAdminUserStatusAction('')).toThrow();
  });

  it('case-sensitive: "ACTIVATE" → throw', () => {
    expect(() => normalizeAdminUserStatusAction('ACTIVATE')).toThrow();
  });

  it('SQL injection attempt → throw', () => {
    expect(() => normalizeAdminUserStatusAction("activate'; DROP TABLE users;--")).toThrow();
  });

  it('whitespace prefix → throw (exact match)', () => {
    expect(() => normalizeAdminUserStatusAction(' activate')).toThrow();
  });

  it('null cast → throw', () => {
    expect(() => normalizeAdminUserStatusAction(null as any)).toThrow();
  });

  it('undefined cast → throw', () => {
    expect(() => normalizeAdminUserStatusAction(undefined as any)).toThrow();
  });
});

describe('ACHIEVEMENT_CHECKS — registry', () => {
  it('15 achievement key kayıtlı', () => {
    expect(Object.keys(ACHIEVEMENT_CHECKS)).toHaveLength(15);
  });

  it('review milestone achievement\'ları (FIRST/FIVE/TEN/FIFTY)', () => {
    expect(ACHIEVEMENT_CHECKS.FIRST_REVIEW).toBe('first_review');
    expect(ACHIEVEMENT_CHECKS.FIVE_REVIEWS).toBe('five_reviews');
    expect(ACHIEVEMENT_CHECKS.TEN_REVIEWS).toBe('ten_reviews');
    expect(ACHIEVEMENT_CHECKS.FIFTY_REVIEWS).toBe('fifty_reviews');
  });

  it('favorite milestone (FIRST/HUNDRED)', () => {
    expect(ACHIEVEMENT_CHECKS.FIRST_FAVORITE).toBe('first_favorite');
    expect(ACHIEVEMENT_CHECKS.HUNDRED_FAVORITES).toBe('hundred_favorites');
  });

  it('comment achievement', () => {
    expect(ACHIEVEMENT_CHECKS.FIRST_COMMENT).toBe('first_comment');
    expect(ACHIEVEMENT_CHECKS.HELPFUL_COMMENTS).toBe('helpful_comments');
  });

  it('special achievement (verified, place_owner, etc.)', () => {
    expect(ACHIEVEMENT_CHECKS.VERIFIED_REVIEWER).toBe('verified_reviewer');
    expect(ACHIEVEMENT_CHECKS.PLACE_OWNER).toBe('place_owner');
    expect(ACHIEVEMENT_CHECKS.ACTIVE_FOLLOWER).toBe('active_follower');
    expect(ACHIEVEMENT_CHECKS.TRENDING_CREATOR).toBe('trending_creator');
    expect(ACHIEVEMENT_CHECKS.LOYAL_VISITOR).toBe('loyal_visitor');
    expect(ACHIEVEMENT_CHECKS.EARLY_ADOPTER).toBe('early_adopter');
    expect(ACHIEVEMENT_CHECKS.SOCIAL_BUTTERFLY).toBe('social_butterfly');
  });

  it('tüm değerler snake_case (DB convention)', () => {
    for (const value of Object.values(ACHIEVEMENT_CHECKS)) {
      expect(value).toMatch(/^[a-z_]+$/);
    }
  });

  it('tüm key constant (uppercase) snake_case ile uyumlu', () => {
    for (const [key, value] of Object.entries(ACHIEVEMENT_CHECKS)) {
      expect(key.toLowerCase()).toBe(value);
    }
  });

  it('unique values (collision yok)', () => {
    const values = Object.values(ACHIEVEMENT_CHECKS);
    expect(new Set(values).size).toBe(values.length);
  });
});
