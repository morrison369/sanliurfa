/**
 * Unit Tests - data/data-warehouse.ts pure helpers + queryOLAP throw paths
 *
 * - getAvailableDimensions / getAvailableMeasures (5 dimension + 4 measure constants)
 * - queryOLAP throw paths:
 *   - Invalid dimension throw "Invalid dimension: X"
 *   - Invalid measure throw "Invalid measure: X"
 *   - Invalid orderBy throw "Invalid orderBy: X" (HARD RULE - SQL injection defense)
 *
 * NOT: queryOLAP DB execution paths skip (queryMany cache kontrol gecmesi gerekli).
 * vi.mock cache - getCache returns null so queryOLAP attempts SQL build then throws on validation.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue('OK'),
  deleteCache: vi.fn().mockResolvedValue(1),
  redis: {
    lpush: vi.fn(),
    setex: vi.fn(),
  },
}));

import { getAvailableDimensions, getAvailableMeasures, queryOLAP } from '../data/data-warehouse';

describe('getAvailableDimensions', () => {
  it('5 dimension constant donusu', () => {
    const dims = getAvailableDimensions();
    expect(dims).toHaveLength(5);
    const names = dims.map((d) => d.name);
    expect(names).toContain('category');
    expect(names).toContain('district');
    expect(names).toContain('year');
    expect(names).toContain('month');
    expect(names).toContain('rating_band');
  });

  it('her dimension - name + label + levels', () => {
    const dims = getAvailableDimensions();
    for (const d of dims) {
      expect(d.name).toBeDefined();
      expect(d.label).toBeDefined();
      expect(Array.isArray(d.levels)).toBe(true);
    }
  });

  it('month dimension - 3-level hierarchy (all/year/month)', () => {
    const month = getAvailableDimensions().find((d) => d.name === 'month');
    expect(month?.levels).toEqual(['all', 'year', 'month']);
  });
});

describe('getAvailableMeasures', () => {
  it('4 measure constant donusu', () => {
    const measures = getAvailableMeasures();
    expect(measures).toHaveLength(4);
    const names = measures.map((m) => m.name);
    expect(names).toContain('visit_sum');
    expect(names).toContain('review_avg');
    expect(names).toContain('review_count');
    expect(names).toContain('interaction_sum');
  });

  it('her measure - type sum / avg', () => {
    const measures = getAvailableMeasures();
    for (const m of measures) {
      expect(['sum', 'avg']).toContain(m.type);
    }
  });
});

describe('queryOLAP - validation throw paths (security lock)', () => {
  it('Invalid dimension - throw "Invalid dimension: X"', async () => {
    await expect(
      queryOLAP({
        cube: 'place_activity',
        dimensions: ['malicious-dim'],
        measures: ['visit_sum'],
      })
    ).rejects.toThrow(/Invalid dimension/);
  });

  it('Invalid measure - throw "Invalid measure: X"', async () => {
    await expect(
      queryOLAP({
        cube: 'place_activity',
        dimensions: ['category'],
        measures: ['DROP TABLE users'],
      })
    ).rejects.toThrow(/Invalid measure/);
  });

  it('Invalid orderBy - throw "Invalid orderBy: X"', async () => {
    await expect(
      queryOLAP({
        cube: 'place_activity',
        dimensions: ['category'],
        measures: ['visit_sum'],
        orderBy: 'malicious; DROP TABLE',
      })
    ).rejects.toThrow(/Invalid orderBy/);
  });

  it('valid dimension + measure + orderBy passes validation (DB execution skip)', async () => {
    // DB execution will fail (queryMany throws) but validation should NOT throw
    try {
      await queryOLAP({
        cube: 'place_activity',
        dimensions: ['category'],
        measures: ['visit_sum'],
        orderBy: 'visit_sum',
      });
    } catch (err: any) {
      // DB error is fine; validation error would mention "Invalid"
      expect(err.message).not.toMatch(/Invalid (dimension|measure|orderBy)/);
    }
  });
});
