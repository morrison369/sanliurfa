/**
 * Unit Tests — security/security-guidelines.ts
 *
 * - SECURITY_GUIDELINES: registry of OWASP best practices
 * - getAllGuidelines/getByCategory/getUnimplementedGuidelines/calculateSecurityScore/getCriticalItems
 */

import { describe, it, expect } from 'vitest';
import {
  SECURITY_GUIDELINES,
  getAllGuidelines,
  getGuidelinesByCategory,
  getUnimplementedGuidelines,
  calculateSecurityScore,
  getCriticalItems,
} from '../security/security-guidelines';

describe('SECURITY_GUIDELINES — registry', () => {
  it('non-empty array', () => {
    expect(SECURITY_GUIDELINES.length).toBeGreaterThan(5);
  });

  it('tüm guideline id/category/title/description tam', () => {
    for (const g of SECURITY_GUIDELINES) {
      expect(g.id).toBeTruthy();
      expect(g.category).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low']).toContain(g.impact);
      expect(typeof g.implemented).toBe('boolean');
    }
  });

  it('Authentication kategorisi içerir', () => {
    expect(SECURITY_GUIDELINES.some((g) => g.category === 'Authentication')).toBe(true);
  });

  it('API Security kategorisi içerir', () => {
    expect(SECURITY_GUIDELINES.some((g) => g.category === 'API Security')).toBe(true);
  });

  it('Data Protection kategorisi içerir', () => {
    expect(SECURITY_GUIDELINES.some((g) => g.category === 'Data Protection')).toBe(true);
  });
});

describe('getAllGuidelines', () => {
  it('SECURITY_GUIDELINES referansı döner', () => {
    expect(getAllGuidelines()).toBe(SECURITY_GUIDELINES);
  });
});

describe('getGuidelinesByCategory', () => {
  it('Authentication filter', () => {
    const result = getGuidelinesByCategory('Authentication');
    expect(result.every((g) => g.category === 'Authentication')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('bilinmeyen kategori → boş array', () => {
    expect(getGuidelinesByCategory('NonExistent')).toEqual([]);
  });

  it('case-sensitive ("authentication" lowercase) → boş', () => {
    expect(getGuidelinesByCategory('authentication')).toEqual([]);
  });
});

describe('getUnimplementedGuidelines', () => {
  it('implemented=false filter + impact desc sıralı (critical → low)', () => {
    const result = getUnimplementedGuidelines();
    expect(result.every((g) => !g.implemented)).toBe(true);
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < result.length; i++) {
      expect(impactOrder[result[i - 1].impact]).toBeLessThanOrEqual(impactOrder[result[i].impact]);
    }
  });
});

describe('calculateSecurityScore', () => {
  it('score 0-100 + implemented + total', () => {
    const result = calculateSecurityScore();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.implemented).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeGreaterThanOrEqual(result.implemented);
  });

  it('total = SECURITY_GUIDELINES.length', () => {
    expect(calculateSecurityScore().total).toBe(SECURITY_GUIDELINES.length);
  });

  it('score = round(implemented / total * 100)', () => {
    const result = calculateSecurityScore();
    const expected = Math.round((result.implemented / result.total) * 100);
    expect(result.score).toBe(expected);
  });
});

describe('getCriticalItems', () => {
  it('!implemented + impact=critical filter', () => {
    const result = getCriticalItems();
    expect(result.every((g) => !g.implemented && g.impact === 'critical')).toBe(true);
  });

  it('boş veya non-empty (impl edilmemiş critical varsa)', () => {
    const result = getCriticalItems();
    expect(Array.isArray(result)).toBe(true);
  });
});
