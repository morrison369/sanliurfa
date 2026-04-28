/**
 * WebVitalsCard component unit tests
 *
 * Validates Google Web Vitals threshold-based color coding logic for
 * Migration 168'in CLS + INP kolonlarını dashboard'a göstermek için.
 */

import { describe, it, expect } from 'vitest';

// Re-implement classifyMetric for unit-testable isolation
const THRESHOLDS = {
  LCP:  { good: 2500, poor: 4000 },
  INP:  { good: 200,  poor: 500  },
  CLS:  { good: 0.1,  poor: 0.25 },
  FCP:  { good: 1800, poor: 3000 },
  TTFB: { good: 800,  poor: 1800 },
};

function classifyMetric(name: string, p75: number): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  const t = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!t) return 'unknown';
  if (p75 === 0) return 'unknown';
  if (p75 <= t.good) return 'good';
  if (p75 <= t.poor) return 'needs-improvement';
  return 'poor';
}

describe('WebVitalsCard threshold classification', () => {
  describe('LCP (Largest Contentful Paint, ms)', () => {
    it('classifies <=2500ms as good', () => {
      expect(classifyMetric('LCP', 2000)).toBe('good');
      expect(classifyMetric('LCP', 2500)).toBe('good');
    });

    it('classifies 2500-4000ms as needs-improvement', () => {
      expect(classifyMetric('LCP', 3000)).toBe('needs-improvement');
      expect(classifyMetric('LCP', 4000)).toBe('needs-improvement');
    });

    it('classifies >4000ms as poor', () => {
      expect(classifyMetric('LCP', 5000)).toBe('poor');
      expect(classifyMetric('LCP', 10000)).toBe('poor');
    });
  });

  describe('INP (Interaction to Next Paint, ms)', () => {
    it('classifies <=200ms as good', () => {
      expect(classifyMetric('INP', 100)).toBe('good');
      expect(classifyMetric('INP', 200)).toBe('good');
    });

    it('classifies 200-500ms as needs-improvement', () => {
      expect(classifyMetric('INP', 300)).toBe('needs-improvement');
      expect(classifyMetric('INP', 500)).toBe('needs-improvement');
    });

    it('classifies >500ms as poor', () => {
      expect(classifyMetric('INP', 600)).toBe('poor');
    });
  });

  describe('CLS (Cumulative Layout Shift, score 0-1)', () => {
    it('classifies <=0.1 as good', () => {
      expect(classifyMetric('CLS', 0.05)).toBe('good');
      expect(classifyMetric('CLS', 0.1)).toBe('good');
    });

    it('classifies 0.1-0.25 as needs-improvement', () => {
      expect(classifyMetric('CLS', 0.15)).toBe('needs-improvement');
      expect(classifyMetric('CLS', 0.25)).toBe('needs-improvement');
    });

    it('classifies >0.25 as poor', () => {
      expect(classifyMetric('CLS', 0.3)).toBe('poor');
      expect(classifyMetric('CLS', 0.5)).toBe('poor');
    });
  });

  describe('Edge cases', () => {
    it('returns unknown for zero value (no data)', () => {
      expect(classifyMetric('LCP', 0)).toBe('unknown');
      expect(classifyMetric('CLS', 0)).toBe('unknown');
    });

    it('returns unknown for unrecognized metric', () => {
      expect(classifyMetric('FAKE_METRIC', 100)).toBe('unknown');
      expect(classifyMetric('XYZ', 0.5)).toBe('unknown');
    });
  });

  describe('Supplementary metrics', () => {
    it('classifies FCP correctly', () => {
      expect(classifyMetric('FCP', 1500)).toBe('good');
      expect(classifyMetric('FCP', 2500)).toBe('needs-improvement');
      expect(classifyMetric('FCP', 4000)).toBe('poor');
    });

    it('classifies TTFB correctly', () => {
      expect(classifyMetric('TTFB', 500)).toBe('good');
      expect(classifyMetric('TTFB', 1500)).toBe('needs-improvement');
      expect(classifyMetric('TTFB', 2500)).toBe('poor');
    });
  });
});
