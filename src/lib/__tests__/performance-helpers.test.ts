/**
 * Unit Tests — performance.ts pure helpers
 *
 * - VITALS_THRESHOLDS: Core Web Vitals (LCP/FID/CLS/FCP/TTFB/INP) good/poor boundary
 * - getMetrics(): metric snapshot (referans değil kopya)
 * - getMetricRating(metric, value): good / needs-improvement / poor classifier
 * - debounce / throttle (alternative impl from utils, ayrı test)
 *
 * Browser-bound helper'lar (initPerformanceMonitoring/sendMetrics/trackTiming/
 * trackInteraction/preloadResource/prefetchRoute) DOM gerektirir — bu dosyada yok.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VITALS_THRESHOLDS,
  getMetrics,
  getMetricRating,
  debounce,
  throttle,
} from '../performance';

describe('VITALS_THRESHOLDS', () => {
  it('LCP — good 2500ms, poor 4000ms', () => {
    expect(VITALS_THRESHOLDS.LCP.good).toBe(2500);
    expect(VITALS_THRESHOLDS.LCP.poor).toBe(4000);
  });

  it('FID — good 100ms, poor 300ms', () => {
    expect(VITALS_THRESHOLDS.FID.good).toBe(100);
    expect(VITALS_THRESHOLDS.FID.poor).toBe(300);
  });

  it('CLS — good 0.1, poor 0.25 (unitless layout shift)', () => {
    expect(VITALS_THRESHOLDS.CLS.good).toBe(0.1);
    expect(VITALS_THRESHOLDS.CLS.poor).toBe(0.25);
  });

  it('FCP — good 1800ms, poor 3000ms', () => {
    expect(VITALS_THRESHOLDS.FCP.good).toBe(1800);
    expect(VITALS_THRESHOLDS.FCP.poor).toBe(3000);
  });

  it('TTFB — good 800ms, poor 1800ms', () => {
    expect(VITALS_THRESHOLDS.TTFB.good).toBe(800);
    expect(VITALS_THRESHOLDS.TTFB.poor).toBe(1800);
  });

  it('INP — good 200ms, poor 500ms', () => {
    expect(VITALS_THRESHOLDS.INP.good).toBe(200);
    expect(VITALS_THRESHOLDS.INP.poor).toBe(500);
  });

  it('tüm metric için good < poor (sanity check)', () => {
    for (const metric of Object.keys(VITALS_THRESHOLDS) as Array<keyof typeof VITALS_THRESHOLDS>) {
      expect(VITALS_THRESHOLDS[metric].good).toBeLessThan(VITALS_THRESHOLDS[metric].poor);
    }
  });

  it('6 metric kayıtlı', () => {
    expect(Object.keys(VITALS_THRESHOLDS)).toHaveLength(6);
  });
});

describe('getMetricRating', () => {
  describe('LCP boundary', () => {
    it('value <= 2500 → good', () => {
      expect(getMetricRating('LCP', 0)).toBe('good');
      expect(getMetricRating('LCP', 2500)).toBe('good');
    });

    it('2500 < value <= 4000 → needs-improvement', () => {
      expect(getMetricRating('LCP', 2501)).toBe('needs-improvement');
      expect(getMetricRating('LCP', 3500)).toBe('needs-improvement');
      expect(getMetricRating('LCP', 4000)).toBe('needs-improvement');
    });

    it('value > 4000 → poor', () => {
      expect(getMetricRating('LCP', 4001)).toBe('poor');
      expect(getMetricRating('LCP', 10000)).toBe('poor');
    });
  });

  describe('FID boundary', () => {
    it('100 → good (eşitlik dahil)', () => {
      expect(getMetricRating('FID', 100)).toBe('good');
    });

    it('200 → needs-improvement', () => {
      expect(getMetricRating('FID', 200)).toBe('needs-improvement');
    });

    it('500 → poor', () => {
      expect(getMetricRating('FID', 500)).toBe('poor');
    });
  });

  describe('CLS boundary (unitless float)', () => {
    it('0.05 → good', () => {
      expect(getMetricRating('CLS', 0.05)).toBe('good');
    });

    it('0.1 → good (eşitlik dahil)', () => {
      expect(getMetricRating('CLS', 0.1)).toBe('good');
    });

    it('0.2 → needs-improvement', () => {
      expect(getMetricRating('CLS', 0.2)).toBe('needs-improvement');
    });

    it('0.5 → poor', () => {
      expect(getMetricRating('CLS', 0.5)).toBe('poor');
    });
  });

  describe('TTFB / FCP / INP boundaries', () => {
    it('TTFB 800 → good, 1800 → needs-improvement, 2000 → poor', () => {
      expect(getMetricRating('TTFB', 800)).toBe('good');
      expect(getMetricRating('TTFB', 1800)).toBe('needs-improvement');
      expect(getMetricRating('TTFB', 2000)).toBe('poor');
    });

    it('FCP 1800 → good, 3000 → needs-improvement, 5000 → poor', () => {
      expect(getMetricRating('FCP', 1800)).toBe('good');
      expect(getMetricRating('FCP', 3000)).toBe('needs-improvement');
      expect(getMetricRating('FCP', 5000)).toBe('poor');
    });

    it('INP 200 → good, 500 → needs-improvement, 800 → poor', () => {
      expect(getMetricRating('INP', 200)).toBe('good');
      expect(getMetricRating('INP', 500)).toBe('needs-improvement');
      expect(getMetricRating('INP', 800)).toBe('poor');
    });
  });

  it('0 değer → good (en hızlı)', () => {
    expect(getMetricRating('LCP', 0)).toBe('good');
    expect(getMetricRating('CLS', 0)).toBe('good');
  });
});

describe('getMetrics', () => {
  it('snapshot döner — tip PerformanceMetrics', () => {
    const m = getMetrics();
    expect(typeof m).toBe('object');
    // Boş başta, sadece browser tarafında doldurulur (Node ortamında undefined)
  });

  it('iki çağrı aynı içerik (referans değil kopya — spread)', () => {
    const m1 = getMetrics();
    const m2 = getMetrics();
    expect(m1).toEqual(m2);
    expect(m1).not.toBe(m2); // farklı referans
  });
});

describe('performance.debounce (utils.debounce\'tan ayrı impl)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('art arda çağrı → sadece son çalışır', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d('a');
    d('b');
    d('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('wait süresi geçtikten sonra çalışır', () => {
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d('x');
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('performance.throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ilk çağrı hemen', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t('a');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('window içi çağrı atılır', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t('a');
    t('b');
    t('c');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('window sonrası tekrar çalışır', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t('a');
    vi.advanceTimersByTime(100);
    t('b');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
