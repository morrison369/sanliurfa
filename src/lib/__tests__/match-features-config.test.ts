/**
 * Unit Tests — social/match-features.ts getSocialFeatureConfig (env-driven)
 *
 * - parseBoolean: 1/true/yes/on → true; 0/false/no/off → false; bilinmeyen → fallback
 * - parseNumber: NaN/Infinity → fallback; min 1; floor
 * - getSocialFeatureConfig: 4 env (SOCIAL_OPEN_ACCESS / TINDER_ENABLED / AUTO_CONVERSATION / SWIPE_DAILY_LIMIT)
 *
 * vi.stubEnv + afterEach unstub.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { getSocialFeatureConfig } from '../social/match-features';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSocialFeatureConfig — boolean parse', () => {
  it('default — env yok → tüm ayarlar true (Phase 1 open access)', () => {
    const c = getSocialFeatureConfig();
    expect(c.openAccess).toBe(true);
    expect(c.tinderEnabled).toBe(true);
    expect(c.autoConversationOnMatch).toBe(true);
    expect(c.dailySwipeLimit).toBe(100);
  });

  it('SOCIAL_OPEN_ACCESS=0 → openAccess false', () => {
    vi.stubEnv('SOCIAL_OPEN_ACCESS', '0');
    expect(getSocialFeatureConfig().openAccess).toBe(false);
  });

  it('SOCIAL_OPEN_ACCESS=false → openAccess false', () => {
    vi.stubEnv('SOCIAL_OPEN_ACCESS', 'false');
    expect(getSocialFeatureConfig().openAccess).toBe(false);
  });

  it('SOCIAL_OPEN_ACCESS=NO → openAccess false (case-insensitive)', () => {
    vi.stubEnv('SOCIAL_OPEN_ACCESS', 'NO');
    expect(getSocialFeatureConfig().openAccess).toBe(false);
  });

  it('SOCIAL_OPEN_ACCESS=on → openAccess true', () => {
    vi.stubEnv('SOCIAL_OPEN_ACCESS', 'on');
    expect(getSocialFeatureConfig().openAccess).toBe(true);
  });

  it('SOCIAL_OPEN_ACCESS=invalid → fallback default true', () => {
    vi.stubEnv('SOCIAL_OPEN_ACCESS', 'maybe');
    expect(getSocialFeatureConfig().openAccess).toBe(true);
  });

  it('SOCIAL_OPEN_ACCESS=  TRUE  → trim + lowercase → true', () => {
    vi.stubEnv('SOCIAL_OPEN_ACCESS', '  TRUE  ');
    expect(getSocialFeatureConfig().openAccess).toBe(true);
  });

  it('SOCIAL_TINDER_ENABLED=off → tinderEnabled false', () => {
    vi.stubEnv('SOCIAL_TINDER_ENABLED', 'off');
    expect(getSocialFeatureConfig().tinderEnabled).toBe(false);
  });

  it('SOCIAL_AUTO_CONVERSATION=0 → autoConversationOnMatch false', () => {
    vi.stubEnv('SOCIAL_AUTO_CONVERSATION', '0');
    expect(getSocialFeatureConfig().autoConversationOnMatch).toBe(false);
  });
});

describe('getSocialFeatureConfig — number parse', () => {
  it('SOCIAL_SWIPE_DAILY_LIMIT=50 → 50', () => {
    vi.stubEnv('SOCIAL_SWIPE_DAILY_LIMIT', '50');
    expect(getSocialFeatureConfig().dailySwipeLimit).toBe(50);
  });

  it('SOCIAL_SWIPE_DAILY_LIMIT=0 → Math.max(1) = 1', () => {
    vi.stubEnv('SOCIAL_SWIPE_DAILY_LIMIT', '0');
    expect(getSocialFeatureConfig().dailySwipeLimit).toBe(1);
  });

  it('SOCIAL_SWIPE_DAILY_LIMIT=abc → fallback 100 (NaN guard)', () => {
    vi.stubEnv('SOCIAL_SWIPE_DAILY_LIMIT', 'abc');
    expect(getSocialFeatureConfig().dailySwipeLimit).toBe(100);
  });

  it('SOCIAL_SWIPE_DAILY_LIMIT=Infinity → fallback 100', () => {
    vi.stubEnv('SOCIAL_SWIPE_DAILY_LIMIT', 'Infinity');
    expect(getSocialFeatureConfig().dailySwipeLimit).toBe(100);
  });

  it('SOCIAL_SWIPE_DAILY_LIMIT=99.7 → Math.floor → 99', () => {
    vi.stubEnv('SOCIAL_SWIPE_DAILY_LIMIT', '99.7');
    expect(getSocialFeatureConfig().dailySwipeLimit).toBe(99);
  });

  it('SOCIAL_SWIPE_DAILY_LIMIT="" boş string → fallback 100', () => {
    vi.stubEnv('SOCIAL_SWIPE_DAILY_LIMIT', '');
    expect(getSocialFeatureConfig().dailySwipeLimit).toBe(100);
  });
});
