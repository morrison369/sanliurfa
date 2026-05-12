/**
 * Unit Tests — performance-tracking.ts pure helpers
 *
 * - getMetricRating(name, value): Web Vitals 3-tier classifier (good/needs-improvement/poor)
 * - getMetricColor(rating): rating → hex color (#22c55e/#f59e0b/#ef4444)
 * - getMetricUnit(name): CLS unitless, diğerleri 'ms'
 *
 * Note: getNavigationTiming/getResourceTiming/getConnectionInfo/observeWebVitals
 * DOM-bound (window/performance API), bu test dosyasında yok.
 */

import { describe, it, expect } from 'vitest';
import { getMetricRating, getMetricColor, getMetricUnit } from '../performance-tracking';

describe('getMetricRating — Web Vitals 3-tier classifier', () => {
  describe('FCP (First Contentful Paint)', () => {
    it('1500ms → good (≤1800)', () => {
      expect(getMetricRating('FCP', 1500)).toBe('good');
    });

    it('1800ms boundary inclusive → good', () => {
      expect(getMetricRating('FCP', 1800)).toBe('good');
    });

    it('2500ms → needs-improvement', () => {
      expect(getMetricRating('FCP', 2500)).toBe('needs-improvement');
    });

    it('3000ms boundary inclusive → needs-improvement', () => {
      expect(getMetricRating('FCP', 3000)).toBe('needs-improvement');
    });

    it('5000ms → poor', () => {
      expect(getMetricRating('FCP', 5000)).toBe('poor');
    });
  });

  describe('LCP (Largest Contentful Paint)', () => {
    it('2500ms boundary → good', () => {
      expect(getMetricRating('LCP', 2500)).toBe('good');
    });

    it('4000ms boundary → needs-improvement', () => {
      expect(getMetricRating('LCP', 4000)).toBe('needs-improvement');
    });

    it('5000ms → poor', () => {
      expect(getMetricRating('LCP', 5000)).toBe('poor');
    });
  });

  describe('CLS (Cumulative Layout Shift) — unitless', () => {
    it('0.05 → good', () => {
      expect(getMetricRating('CLS', 0.05)).toBe('good');
    });

    it('0.1 boundary → good', () => {
      expect(getMetricRating('CLS', 0.1)).toBe('good');
    });

    it('0.2 → needs-improvement', () => {
      expect(getMetricRating('CLS', 0.2)).toBe('needs-improvement');
    });

    it('0.25 boundary → needs-improvement', () => {
      expect(getMetricRating('CLS', 0.25)).toBe('needs-improvement');
    });

    it('0.5 → poor', () => {
      expect(getMetricRating('CLS', 0.5)).toBe('poor');
    });

    it('0 → good (perfect)', () => {
      expect(getMetricRating('CLS', 0)).toBe('good');
    });
  });

  describe('FID (First Input Delay)', () => {
    it('100ms boundary → good', () => {
      expect(getMetricRating('FID', 100)).toBe('good');
    });

    it('300ms boundary → needs-improvement', () => {
      expect(getMetricRating('FID', 300)).toBe('needs-improvement');
    });

    it('500ms → poor', () => {
      expect(getMetricRating('FID', 500)).toBe('poor');
    });
  });

  describe('INP (Interaction to Next Paint)', () => {
    it('200ms boundary → good', () => {
      expect(getMetricRating('INP', 200)).toBe('good');
    });

    it('500ms boundary → needs-improvement', () => {
      expect(getMetricRating('INP', 500)).toBe('needs-improvement');
    });

    it('800ms → poor', () => {
      expect(getMetricRating('INP', 800)).toBe('poor');
    });
  });

  describe('TTFB (Time to First Byte)', () => {
    it('800ms boundary → good', () => {
      expect(getMetricRating('TTFB', 800)).toBe('good');
    });

    it('1800ms boundary → needs-improvement', () => {
      expect(getMetricRating('TTFB', 1800)).toBe('needs-improvement');
    });

    it('2500ms → poor', () => {
      expect(getMetricRating('TTFB', 2500)).toBe('poor');
    });
  });
});

describe('getMetricColor — rating → hex color', () => {
  it('good → yeşil #22c55e', () => {
    expect(getMetricColor('good')).toBe('#22c55e');
  });

  it('needs-improvement → turuncu #f59e0b', () => {
    expect(getMetricColor('needs-improvement')).toBe('#f59e0b');
  });

  it('poor → kırmızı #ef4444', () => {
    expect(getMetricColor('poor')).toBe('#ef4444');
  });

  it('hex format kontrolü (# + 6 hex char)', () => {
    expect(getMetricColor('good')).toMatch(/^#[0-9a-f]{6}$/);
    expect(getMetricColor('needs-improvement')).toMatch(/^#[0-9a-f]{6}$/);
    expect(getMetricColor('poor')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('getMetricUnit — birim suffix', () => {
  it('CLS → boş string (unitless)', () => {
    expect(getMetricUnit('CLS')).toBe('');
  });

  it('FCP → "ms"', () => {
    expect(getMetricUnit('FCP')).toBe('ms');
  });

  it('LCP → "ms"', () => {
    expect(getMetricUnit('LCP')).toBe('ms');
  });

  it('FID → "ms"', () => {
    expect(getMetricUnit('FID')).toBe('ms');
  });

  it('INP → "ms"', () => {
    expect(getMetricUnit('INP')).toBe('ms');
  });

  it('TTFB → "ms"', () => {
    expect(getMetricUnit('TTFB')).toBe('ms');
  });
});

describe('Cross-check: rating + color tutarlılığı', () => {
  it('FCP 1500ms → good → #22c55e', () => {
    const rating = getMetricRating('FCP', 1500);
    expect(getMetricColor(rating)).toBe('#22c55e');
  });

  it('LCP 4500ms → poor → #ef4444', () => {
    const rating = getMetricRating('LCP', 4500);
    expect(getMetricColor(rating)).toBe('#ef4444');
  });

  it('CLS 0.15 → needs-improvement → #f59e0b', () => {
    const rating = getMetricRating('CLS', 0.15);
    expect(getMetricColor(rating)).toBe('#f59e0b');
  });
});
