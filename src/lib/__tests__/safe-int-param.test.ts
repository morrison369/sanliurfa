/**
 * safeIntParam helper unit tests
 *
 * NaN bug class fix — `Math.max(1, parseInt('abc'))` → NaN propagates to SQL.
 * Helper guarantees: always returns valid integer in [min, max] range.
 */

import { describe, it, expect } from 'vitest';
import { safeIntParam } from '../api';

describe('safeIntParam', () => {
  describe('valid inputs', () => {
    it('parses numeric string', () => {
      expect(safeIntParam('42', 10, 1, 100)).toBe(42);
    });

    it('passes through number type', () => {
      expect(safeIntParam(42, 10, 1, 100)).toBe(42);
    });

    it('uses default for null', () => {
      expect(safeIntParam(null, 10, 1, 100)).toBe(10);
    });

    it('uses default for undefined', () => {
      expect(safeIntParam(undefined, 10, 1, 100)).toBe(10);
    });

    it('uses default for empty string', () => {
      expect(safeIntParam('', 10, 1, 100)).toBe(10);
    });
  });

  describe('NaN guard (the bug class)', () => {
    it('uses default for non-numeric string (was NaN bug)', () => {
      expect(safeIntParam('abc', 10, 1, 100)).toBe(10);
    });

    it('uses default for SQL injection attempt string', () => {
      expect(safeIntParam("'; DROP TABLE users--", 10, 1, 100)).toBe(10);
    });

    it('uses default for explicit NaN', () => {
      expect(safeIntParam(NaN, 10, 1, 100)).toBe(10);
    });

    it('uses default for Infinity (safer than clamping)', () => {
      // Number.isFinite(Infinity) === false → fallback to default
      expect(safeIntParam(Infinity, 10, 1, 100)).toBe(10);
      expect(safeIntParam(-Infinity, 10, 1, 100)).toBe(10);
    });

    it('uses default for object input', () => {
      expect(safeIntParam({}, 10, 1, 100)).toBe(10);
    });

    it('uses default for array input', () => {
      expect(safeIntParam(['abc'], 10, 1, 100)).toBe(10);
    });
  });

  describe('range bounds (DoS prevention)', () => {
    it('clamps above max', () => {
      expect(safeIntParam('100000', 10, 1, 50)).toBe(50);
    });

    it('clamps below min', () => {
      expect(safeIntParam('-100', 10, 1, 50)).toBe(1);
    });

    it('clamps zero to min if min > 0', () => {
      expect(safeIntParam('0', 10, 1, 50)).toBe(1);
    });

    it('allows zero if min is 0 (offset case)', () => {
      expect(safeIntParam('0', 0, 0, 1000)).toBe(0);
    });

    it('exact boundary inclusive (min and max are valid)', () => {
      expect(safeIntParam('1', 10, 1, 100)).toBe(1);
      expect(safeIntParam('100', 10, 1, 100)).toBe(100);
    });
  });

  describe('partial numeric parsing', () => {
    it('parses leading digits ("42abc" → 42, classic parseInt behavior)', () => {
      expect(safeIntParam('42abc', 10, 1, 100)).toBe(42);
    });

    it('uses default when no leading digits', () => {
      expect(safeIntParam('abc42', 10, 1, 100)).toBe(10);
    });
  });
});
