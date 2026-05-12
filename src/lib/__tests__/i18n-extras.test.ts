/**
 * Unit Tests — i18n.ts ek helper'lar (i18n.spec.ts kapsamı dışındakiler)
 *
 * - t() with template params (interpolation)
 * - formatRelativeTime: az önce / N dakika önce / N saat önce / dün / N gün önce / formatDate fallback
 * - pluralize(count, singular, plural)
 * - getTextDirection() — sabit 'ltr' (Türkçe LTR)
 * - getPreferredLanguage(acceptLanguage) — her zaman 'tr'
 * - interpolate(template, values) — {{key}} placeholder replace
 *
 * Türkçe-only proje (HARD RULE #25); fonksiyonlar locale-agnostic, hep tr döner.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  t,
  formatDate,
  formatRelativeTime,
  pluralize,
  getTextDirection,
  getPreferredLanguage,
  interpolate,
} from '../i18n';

const FIXED_NOW = new Date('2026-05-04T12:00:00Z').getTime();

describe('t() — template params', () => {
  it('valid key + params yoksa düz çevirir', () => {
    expect(t('common.save')).toBe('Kaydet');
  });

  it('params verildi ama template {{}} içermiyor → değişiklik yok', () => {
    expect(t('common.save', { user: 'X' })).toBe('Kaydet');
  });

  it('non-string value (sub-tree) → key döner', () => {
    expect(t('nav')).toBe('nav');
  });

  it('partial path (eksik segment) → key döner', () => {
    expect(t('nav.nonexistent.deep')).toBe('nav.nonexistent.deep');
  });
});

describe('formatDate', () => {
  it('Date objesi tr-TR long ay format', () => {
    const result = formatDate(new Date('2026-03-15'));
    expect(result).toContain('Mart');
    expect(result).toContain('2026');
  });

  it('ISO string input', () => {
    const result = formatDate('2026-12-31');
    expect(result).toContain('Aralık');
  });

  it('day numeric format dahil', () => {
    expect(formatDate(new Date('2026-05-15'))).toContain('15');
  });
});

describe('formatRelativeTime', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('< 60 saniye → "az önce"', () => {
    const date = new Date(FIXED_NOW - 30 * 1000);
    expect(formatRelativeTime(date)).toBe('az önce');
  });

  it('1 saniye önce → "az önce"', () => {
    const date = new Date(FIXED_NOW - 1000);
    expect(formatRelativeTime(date)).toBe('az önce');
  });

  it('5 dakika önce → "5 dakika önce"', () => {
    const date = new Date(FIXED_NOW - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('5 dakika önce');
  });

  it('59 dakika önce', () => {
    const date = new Date(FIXED_NOW - 59 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('59 dakika önce');
  });

  it('1 saat önce → "1 saat önce"', () => {
    const date = new Date(FIXED_NOW - 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('1 saat önce');
  });

  it('3 saat önce', () => {
    const date = new Date(FIXED_NOW - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('3 saat önce');
  });

  it('23 saat önce — 24 saatten az → "saat" formatı', () => {
    const date = new Date(FIXED_NOW - 23 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('23 saat önce');
  });

  it('1 gün önce (tam 24 saat) → "dün"', () => {
    const date = new Date(FIXED_NOW - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('dün');
  });

  it('3 gün önce → "3 gün önce"', () => {
    const date = new Date(FIXED_NOW - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('3 gün önce');
  });

  it('7+ gün önce → formatDate fallback (tam tarih)', () => {
    const date = new Date(FIXED_NOW - 30 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toMatch(/Nisan|Mart|2026/); // 30 gün önce ≈ Nisan
    expect(result).not.toContain('gün önce');
  });

  it('ISO string input kabul', () => {
    const isoStr = new Date(FIXED_NOW - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(isoStr)).toBe('5 dakika önce');
  });
});

describe('pluralize', () => {
  it('count 1 → singular', () => {
    expect(pluralize(1, 'mekan', 'mekanlar')).toBe('1 mekan');
  });

  it('count 0 → plural', () => {
    expect(pluralize(0, 'mekan', 'mekanlar')).toBe('0 mekanlar');
  });

  it('count > 1 → plural', () => {
    expect(pluralize(5, 'mekan', 'mekanlar')).toBe('5 mekanlar');
  });

  it('count 100 → plural', () => {
    expect(pluralize(100, 'değerlendirme', 'değerlendirmeler')).toBe('100 değerlendirmeler');
  });
});

describe('getTextDirection', () => {
  it('her zaman ltr (Türkçe LTR)', () => {
    expect(getTextDirection()).toBe('ltr');
  });
});

describe('getPreferredLanguage', () => {
  it('argüman yoksa tr', () => {
    expect(getPreferredLanguage()).toBe('tr');
  });

  it('Accept-Language header verilmiş — yine tr (multi-lang YOK)', () => {
    expect(getPreferredLanguage('en-US,en;q=0.9')).toBe('tr');
    expect(getPreferredLanguage('de-DE')).toBe('tr');
    expect(getPreferredLanguage('ar-SA')).toBe('tr');
  });

  it('boş string → tr', () => {
    expect(getPreferredLanguage('')).toBe('tr');
  });
});

describe('interpolate', () => {
  it('basit placeholder replace', () => {
    expect(interpolate('Merhaba {{ad}}', { ad: 'Ali' })).toBe('Merhaba Ali');
  });

  it('multiple placeholder', () => {
    expect(interpolate('{{a}} ve {{b}}', { a: 'X', b: 'Y' })).toBe('X ve Y');
  });

  it('aynı placeholder iki kere', () => {
    expect(interpolate('{{x}} - {{x}}', { x: 'abc' })).toBe('abc - abc');
  });

  it('values map\'te yoksa template literal kalır (match döner)', () => {
    expect(interpolate('Hello {{missing}}', {})).toBe('Hello {{missing}}');
  });

  it('placeholder yoksa template aynı döner', () => {
    expect(interpolate('Düz metin', { x: 'y' })).toBe('Düz metin');
  });

  it('boş template → boş', () => {
    expect(interpolate('', { x: 'y' })).toBe('');
  });

  it('Türkçe karakter destek', () => {
    expect(interpolate('Şehir: {{name}}', { name: 'Şanlıurfa' })).toBe('Şehir: Şanlıurfa');
  });

  it('whitespace olan placeholder match etmez (sadece \\w karakter)', () => {
    expect(interpolate('{{ key }}', { key: 'X' })).toBe('{{ key }}');
  });
});
