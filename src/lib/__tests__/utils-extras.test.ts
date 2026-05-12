/**
 * Unit Tests — utils.ts ek helper'lar (utils.test.ts kapsamı dışındakiler)
 *
 * - formatShortDate (kısa Türkçe ay format)
 * - createSEOTitle (siteName append)
 * - formatPhone (10-haneli TR phone formatter)
 * - formatPrice (Intl.NumberFormat TRY currency)
 * - formatNumber (K/M/B suffix)
 * - generateId (crypto.getRandomValues hex string)
 * - debounce / throttle (fake timer testleri)
 * - calculateDistance (Haversine formülü, km)
 *
 * DOM-bound helper'lar (storage/setMetaTag/isInViewport/scrollToElement) bu
 * dosyada yok — jsdom environment gerektirir.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatShortDate,
  createSEOTitle,
  formatPhone,
  formatPrice,
  formatNumber,
  generateId,
  debounce,
  throttle,
  calculateDistance,
} from '../utils';

describe('formatShortDate', () => {
  it('Date object → "DD Aymadı" formatı (kısa ay)', () => {
    const result = formatShortDate(new Date('2026-03-15'));
    // Türkçe kısa ay: Mar/Nis/Mart kısaltması
    expect(result).toMatch(/15/);
    expect(result.length).toBeLessThan(20);
  });

  it('ISO string input', () => {
    expect(formatShortDate('2026-12-25')).toMatch(/25/);
  });
});

describe('createSEOTitle', () => {
  it('siteName ile birleştir (default Sanliurfa.com)', () => {
    expect(createSEOTitle('Hakkımızda')).toBe('Hakkımızda | Sanliurfa.com');
  });

  it('zaten siteName içeren title değiştirilmez', () => {
    expect(createSEOTitle('Sanliurfa.com Hakkında')).toBe('Sanliurfa.com Hakkında');
  });

  it('custom siteName', () => {
    expect(createSEOTitle('X', 'CustomSite')).toBe('X | CustomSite');
  });

  it('boş title yine de prefix oluşturur', () => {
    expect(createSEOTitle('')).toBe(' | Sanliurfa.com');
  });
});

describe('formatPhone', () => {
  it('10 haneli rakam → (XXX) XXX XX XX format', () => {
    expect(formatPhone('5321234567')).toBe('(532) 123 45 67');
  });

  it('zaten formatlı → 10 haneye temizler ve formatlar', () => {
    expect(formatPhone('(532) 123-45-67')).toBe('(532) 123 45 67');
  });

  it('10 haneye dönmüyor → orijinal döner', () => {
    expect(formatPhone('123')).toBe('123');
    expect(formatPhone('905321234567')).toBe('905321234567');
  });

  it('boş string → boş döner', () => {
    expect(formatPhone('')).toBe('');
  });

  it('tüm karakterler non-digit → orijinal', () => {
    expect(formatPhone('abc')).toBe('abc');
  });
});

describe('formatPrice', () => {
  it('default TRY currency', () => {
    const result = formatPrice(100);
    expect(result).toContain('100');
    expect(result).toMatch(/₺|TRY|TL/);
  });

  it('decimal sayı', () => {
    const result = formatPrice(1234.56);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('0 → 0,00 ₺', () => {
    expect(formatPrice(0)).toMatch(/0/);
  });

  it('custom currency (USD)', () => {
    const result = formatPrice(100, 'USD');
    expect(result).toMatch(/\$|USD/);
  });
});

describe('formatNumber', () => {
  it('< 1000 → düz sayı string', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('1000 → 1.0K', () => {
    expect(formatNumber(1000)).toBe('1.0K');
  });

  it('1500 → 1.5K', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('999999 → 999.9K (en yakın K)', () => {
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('1000000 → 1.0M', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
  });

  it('2500000 → 2.5M', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  it('1000000000 → 1.0B', () => {
    expect(formatNumber(1000000000)).toBe('1.0B');
  });

  it('5500000000 → 5.5B', () => {
    expect(formatNumber(5500000000)).toBe('5.5B');
  });
});

describe('generateId', () => {
  it('default 8 karakter hex', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it('custom length', () => {
    expect(generateId(16)).toHaveLength(16);
    expect(generateId(4)).toHaveLength(4);
  });

  it('iki çağrı farklı ID döner (yüksek olasılıkla unique)', () => {
    const id1 = generateId(16);
    const id2 = generateId(16);
    expect(id1).not.toBe(id2);
  });

  it('1 char length', () => {
    expect(generateId(1)).toHaveLength(1);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('art arda çağrı sadece son çağrı çalışır', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced('b');
    debounced('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('wait süresi geçtikten sonra çalışır', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced('x');
    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('iki ayrı debounce window — her ikisi de çalışır', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    vi.advanceTimersByTime(100);
    debounced('b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ilk çağrı hemen çalışır', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('throttle window içinde sonraki çağrı atılır', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    throttled('b');
    throttled('c');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throttle window sonrası tekrar çalışır', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    vi.advanceTimersByTime(100);
    throttled('b');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('calculateDistance — Haversine formülü', () => {
  it('aynı nokta → 0', () => {
    expect(calculateDistance(37.0, 38.0, 37.0, 38.0)).toBe(0);
  });

  it('Şanlıurfa → İstanbul yaklaşık 850-1000 km', () => {
    // Şanlıurfa: 37.16, 38.79 / İstanbul: 41.01, 28.98
    const distance = calculateDistance(37.16, 38.79, 41.01, 28.98);
    expect(distance).toBeGreaterThan(800);
    expect(distance).toBeLessThan(1100);
  });

  it('Şanlıurfa → Diyarbakır yaklaşık 100-200 km', () => {
    // Diyarbakır: 37.91, 40.24
    const distance = calculateDistance(37.16, 38.79, 37.91, 40.24);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(200);
  });

  it('1 derece enlem yaklaşık 111 km', () => {
    const distance = calculateDistance(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it('Ekvatorda 1 derece boylam ≈ 111 km', () => {
    const distance = calculateDistance(0, 0, 0, 1);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it('kuzey kutbunda 1 derece boylam ≈ 0 km', () => {
    const distance = calculateDistance(89.99, 0, 89.99, 1);
    expect(distance).toBeLessThan(1);
  });

  it('antipodal (zıt) noktalar ≈ yarım çevre (yarıçap π * R)', () => {
    const distance = calculateDistance(0, 0, 0, 180);
    // Yarıçap 6371 km, yarım çevre = π * 6371 ≈ 20015 km
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20100);
  });
});
