/**
 * Unit Tests — activity/index.ts pure helpers
 *
 * - getActivityDescription(type): UI description string for 21 activity types
 * - getActivityIcon(type): Lucide icon name for 21 activity types
 *
 * Note: logActivity / getUserActivityFeed / getActivityStreak DB-bound, sadece
 * pure UI helpers test edilir. activity/activity.ts (Batch #246) ayrı module.
 */

import { describe, it, expect } from 'vitest';
import { getActivityDescription, getActivityIcon } from '../activity/index';

describe('getActivityDescription', () => {
  it('place_view → "Mekan goruntuledi"', () => {
    expect(getActivityDescription('place_view')).toBe('Mekan goruntuledi');
  });

  it('place_create → "Yeni mekan ekledi"', () => {
    expect(getActivityDescription('place_create')).toBe('Yeni mekan ekledi');
  });

  it('review_create → "Degerlendirme yazdi"', () => {
    expect(getActivityDescription('review_create')).toBe('Degerlendirme yazdi');
  });

  it('comment_create → "Yorum yapti"', () => {
    expect(getActivityDescription('comment_create')).toBe('Yorum yapti');
  });

  it('favorite_add → "Favorilere ekledi"', () => {
    expect(getActivityDescription('favorite_add')).toBe('Favorilere ekledi');
  });

  it('favorite_remove → "Favorilerden kaldirdi"', () => {
    expect(getActivityDescription('favorite_remove')).toBe('Favorilerden kaldirdi');
  });

  it('collection_create → "Koleksiyon olusturdu"', () => {
    expect(getActivityDescription('collection_create')).toBe('Koleksiyon olusturdu');
  });

  it('follow_user → "Kullanici takip etti"', () => {
    expect(getActivityDescription('follow_user')).toBe('Kullanici takip etti');
  });

  it('unfollow_user → "Kullanici takibi birakti"', () => {
    expect(getActivityDescription('unfollow_user')).toBe('Kullanici takibi birakti');
  });

  it('search → "Arama yapti"', () => {
    expect(getActivityDescription('search')).toBe('Arama yapti');
  });

  it('login/logout → düzgün mesajlar', () => {
    expect(getActivityDescription('login')).toBe('Giris yapti');
    expect(getActivityDescription('logout')).toBe('Cikis yapti');
  });

  it('profile_update → "Profil guncelledi"', () => {
    expect(getActivityDescription('profile_update')).toBe('Profil guncelledi');
  });

  it('bilinmeyen type → type string olduğu gibi (fallback)', () => {
    expect(getActivityDescription('unknown_type' as any)).toBe('unknown_type');
  });

  it('21 activity type için tümü string döner (no undefined)', () => {
    const types = [
      'place_view', 'place_create', 'place_edit',
      'review_create', 'review_edit', 'review_delete',
      'comment_create', 'comment_edit', 'comment_delete',
      'favorite_add', 'favorite_remove',
      'collection_create', 'collection_edit', 'collection_delete',
      'follow_user', 'unfollow_user',
      'search', 'share', 'login', 'logout', 'profile_update',
    ];
    for (const type of types) {
      const desc = getActivityDescription(type as any);
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});

describe('getActivityIcon — Lucide icon names', () => {
  it('place_view → MapPin', () => {
    expect(getActivityIcon('place_view')).toBe('MapPin');
  });

  it('place_create → Plus', () => {
    expect(getActivityIcon('place_create')).toBe('Plus');
  });

  it('review_create → Star', () => {
    expect(getActivityIcon('review_create')).toBe('Star');
  });

  it('favorite_add → Heart', () => {
    expect(getActivityIcon('favorite_add')).toBe('Heart');
  });

  it('favorite_remove → HeartOff', () => {
    expect(getActivityIcon('favorite_remove')).toBe('HeartOff');
  });

  it('collection_create → FolderPlus', () => {
    expect(getActivityIcon('collection_create')).toBe('FolderPlus');
  });

  it('follow_user → UserPlus', () => {
    expect(getActivityIcon('follow_user')).toBe('UserPlus');
  });

  it('unfollow_user → UserMinus', () => {
    expect(getActivityIcon('unfollow_user')).toBe('UserMinus');
  });

  it('search → Search', () => {
    expect(getActivityIcon('search')).toBe('Search');
  });

  it('login/logout → LogIn/LogOut', () => {
    expect(getActivityIcon('login')).toBe('LogIn');
    expect(getActivityIcon('logout')).toBe('LogOut');
  });

  it('comment_create → MessageCircle', () => {
    expect(getActivityIcon('comment_create')).toBe('MessageCircle');
  });

  it('share → Share', () => {
    expect(getActivityIcon('share')).toBe('Share');
  });

  it('delete actions (review/comment/collection) → Trash', () => {
    expect(getActivityIcon('review_delete')).toBe('Trash');
    expect(getActivityIcon('comment_delete')).toBe('Trash');
    expect(getActivityIcon('collection_delete')).toBe('Trash');
  });

  it('edit actions → Edit', () => {
    expect(getActivityIcon('place_edit')).toBe('Edit');
    expect(getActivityIcon('review_edit')).toBe('Edit');
    expect(getActivityIcon('comment_edit')).toBe('Edit');
    expect(getActivityIcon('collection_edit')).toBe('Edit');
  });

  it('bilinmeyen type → "Activity" default', () => {
    expect(getActivityIcon('unknown_type' as any)).toBe('Activity');
  });

  it('21 activity type için tümü string Lucide icon adı döner', () => {
    const types = [
      'place_view', 'place_create', 'place_edit',
      'review_create', 'review_edit', 'review_delete',
      'comment_create', 'comment_edit', 'comment_delete',
      'favorite_add', 'favorite_remove',
      'collection_create', 'collection_edit', 'collection_delete',
      'follow_user', 'unfollow_user',
      'search', 'share', 'login', 'logout', 'profile_update',
    ];
    for (const type of types) {
      const icon = getActivityIcon(type as any);
      expect(typeof icon).toBe('string');
      // PascalCase Lucide convention
      expect(icon).toMatch(/^[A-Z]/);
    }
  });
});
