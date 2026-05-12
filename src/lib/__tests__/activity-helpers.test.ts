/**
 * Unit Tests — activity/activity.ts pure helpers
 *
 * - getActivityDescription(item): UI description string for activity feed
 * - getActivityIcon(item): emoji icon string for activity feed
 *
 * Note: logActivity / getUserActivity DB-bound, bu test sadece pure UI helpers.
 */

import { describe, it, expect } from 'vitest';
import { getActivityDescription, getActivityIcon } from '../activity/activity';

describe('getActivityDescription', () => {
  it('review_created — placeName ile mesaj', () => {
    const item: any = { actionType: 'review_created', metadata: { placeName: 'Balıklıgöl' } };
    expect(getActivityDescription(item)).toBe('"Balıklıgöl" yorum yaptı');
  });

  it('review_created — placeName eksik → "bir yere" fallback', () => {
    const item: any = { actionType: 'review_created', metadata: {} };
    expect(getActivityDescription(item)).toBe('"bir yere" yorum yaptı');
  });

  it('favorite_added — placeName ile', () => {
    const item: any = { actionType: 'favorite_added', metadata: { placeName: 'Göbeklitepe' } };
    expect(getActivityDescription(item)).toBe('"Göbeklitepe" favorilerine ekledi');
  });

  it('favorite_added — eksik → "bir yeri" fallback', () => {
    const item: any = { actionType: 'favorite_added', metadata: {} };
    expect(getActivityDescription(item)).toBe('"bir yeri" favorilerine ekledi');
  });

  it('badge_earned — badgeName ile', () => {
    const item: any = { actionType: 'badge_earned', metadata: { badgeName: 'İlk Yorum' } };
    expect(getActivityDescription(item)).toBe('"İlk Yorum" rozeti kazandı');
  });

  it('badge_earned — eksik → "Rozet" fallback', () => {
    const item: any = { actionType: 'badge_earned', metadata: {} };
    expect(getActivityDescription(item)).toBe('"Rozet" rozeti kazandı');
  });

  it('level_up — newLevel ile', () => {
    const item: any = { actionType: 'level_up', metadata: { newLevel: 5 } };
    expect(getActivityDescription(item)).toBe('Level 5 oldu');
  });

  it('level_up — eksik → "?" fallback', () => {
    const item: any = { actionType: 'level_up', metadata: {} };
    expect(getActivityDescription(item)).toBe('Level ? oldu');
  });

  it('comment_posted — sabit mesaj', () => {
    const item: any = { actionType: 'comment_posted', metadata: {} };
    expect(getActivityDescription(item)).toBe('Blog yazısına yorum yaptı');
  });

  it('points_earned — points ile', () => {
    const item: any = { actionType: 'points_earned', metadata: { points: 100 } };
    expect(getActivityDescription(item)).toBe('100 puan kazandı');
  });

  it('points_earned — eksik → "0 puan kazandı"', () => {
    const item: any = { actionType: 'points_earned', metadata: {} };
    expect(getActivityDescription(item)).toBe('0 puan kazandı');
  });

  it('bilinmeyen actionType → varsayılan mesaj', () => {
    const item: any = { actionType: 'unknown', metadata: {} };
    expect(getActivityDescription(item)).toBe('Bir eylem gerçekleştirdi');
  });

  it('metadata yok → fallback (placeName için)', () => {
    const item: any = { actionType: 'review_created' };
    expect(getActivityDescription(item)).toBe('"bir yere" yorum yaptı');
  });
});

describe('getActivityIcon', () => {
  it('review_created → ✍️', () => {
    expect(getActivityIcon({ actionType: 'review_created' } as any)).toBe('✍️');
  });

  it('favorite_added → ❤️', () => {
    expect(getActivityIcon({ actionType: 'favorite_added' } as any)).toBe('❤️');
  });

  it('badge_earned → 🏅', () => {
    expect(getActivityIcon({ actionType: 'badge_earned' } as any)).toBe('🏅');
  });

  it('level_up → ⬆️', () => {
    expect(getActivityIcon({ actionType: 'level_up' } as any)).toBe('⬆️');
  });

  it('comment_posted → 💬', () => {
    expect(getActivityIcon({ actionType: 'comment_posted' } as any)).toBe('💬');
  });

  it('points_earned → ⭐', () => {
    expect(getActivityIcon({ actionType: 'points_earned' } as any)).toBe('⭐');
  });

  it('bilinmeyen actionType → 📌 default', () => {
    expect(getActivityIcon({ actionType: 'unknown' } as any)).toBe('📌');
  });

  it('boş actionType → 📌', () => {
    expect(getActivityIcon({ actionType: '' } as any)).toBe('📌');
  });
});

describe('getActivityDescription + getActivityIcon — pratik kombinasyon', () => {
  it('aynı item → description ve icon birlikte UI render', () => {
    const item: any = { actionType: 'review_created', metadata: { placeName: 'Şanlıurfa Müzesi' } };
    expect(getActivityDescription(item)).toContain('Şanlıurfa Müzesi');
    expect(getActivityIcon(item)).toBe('✍️');
  });
});
