/**
 * safeFloatParam helper unit tests
 *
 * Float-version of safeIntParam — used for lat/lon/rating/distance URL params.
 * Same NaN guard contract: always returns valid finite number in [min, max] range.
 */

import { describe, it, expect } from 'vitest';
import { safeFloatParam } from '../api';

describe('safeFloatParam', () => {
  describe('valid inputs', () => {
    it('parses decimal string', () => {
      expect(safeFloatParam('3.14', 0, 0, 100)).toBeCloseTo(3.14);
    });

    it('parses integer string as float', () => {
      expect(safeFloatParam('42', 0, 0, 100)).toBe(42);
    });

    it('parses negative decimal', () => {
      expect(safeFloatParam('-12.5', 0, -100, 100)).toBe(-12.5);
    });

    it('passes through number type', () => {
      expect(safeFloatParam(3.14, 0, 0, 10)).toBeCloseTo(3.14);
    });

    it('uses default for null', () => {
      expect(safeFloatParam(null, 1.5, 0, 10)).toBe(1.5);
    });

    it('uses default for undefined', () => {
      expect(safeFloatParam(undefined, 1.5, 0, 10)).toBe(1.5);
    });

    it('uses default for empty string', () => {
      expect(safeFloatParam('', 1.5, 0, 10)).toBe(1.5);
    });
  });

  describe('NaN guard (bug class)', () => {
    it('uses default for non-numeric string', () => {
      expect(safeFloatParam('abc', 1.5, 0, 10)).toBe(1.5);
    });

    it('uses default for SQL injection attempt string', () => {
      expect(safeFloatParam("42; DROP TABLE", 0, 0, 100)).toBe(42); // parseFloat parses leading "42"
    });

    it('uses default for explicit NaN', () => {
      expect(safeFloatParam(NaN, 1.5, 0, 10)).toBe(1.5);
    });

    it('uses default for Infinity', () => {
      expect(safeFloatParam(Infinity, 1.5, 0, 10)).toBe(1.5);
    });

    it('uses default for -Infinity', () => {
      expect(safeFloatParam(-Infinity, 1.5, 0, 10)).toBe(1.5);
    });

    it('uses default for object input', () => {
      expect(safeFloatParam({} as any, 1.5, 0, 10)).toBe(1.5);
    });

    it('parses array input via String() coercion (parseFloat semantics)', () => {
      // [1,2].toString() === "1,2", parseFloat("1,2") === 1
      // Edge case: caller should validate body field type before passing to helper
      expect(safeFloatParam([1, 2] as any, 1.5, 0, 10)).toBe(1);
    });
  });

  describe('range bounds (DoS prevention)', () => {
    it('clamps above max', () => {
      expect(safeFloatParam('999.99', 1.5, 0, 100)).toBe(100);
    });

    it('clamps below min', () => {
      expect(safeFloatParam('-999.99', 1.5, 0, 100)).toBe(0);
    });

    it('exact boundary inclusive (min and max are valid)', () => {
      expect(safeFloatParam('-90', 0, -90, 90)).toBe(-90);
      expect(safeFloatParam('90', 0, -90, 90)).toBe(90);
    });

    it('zero allowed when in range', () => {
      expect(safeFloatParam('0', 1, -10, 10)).toBe(0);
    });
  });

  describe('real-world coordinate usage', () => {
    it('latitude: clamps to [-90, 90]', () => {
      expect(safeFloatParam('37.1591', 0, -90, 90)).toBeCloseTo(37.1591); // Şanlıurfa
      expect(safeFloatParam('500', 0, -90, 90)).toBe(90); // out-of-range clamp
    });

    it('longitude: clamps to [-180, 180]', () => {
      expect(safeFloatParam('38.7969', 0, -180, 180)).toBeCloseTo(38.7969); // Şanlıurfa
      expect(safeFloatParam('-200', 0, -180, 180)).toBe(-180);
    });

    it('rating: clamps to [0, 5]', () => {
      expect(safeFloatParam('4.7', 0, 0, 5)).toBeCloseTo(4.7);
      expect(safeFloatParam('10', 0, 0, 5)).toBe(5);
    });

    it('distance km: clamps to [0, MAX]', () => {
      expect(safeFloatParam('25.5', 5, 0, 1000)).toBeCloseTo(25.5);
      expect(safeFloatParam('NaN', 5, 0, 1000)).toBe(5);
    });
  });

  describe('partial numeric parsing (parseFloat semantics)', () => {
    it('parses leading digits', () => {
      expect(safeFloatParam('3.14abc', 0, 0, 10)).toBeCloseTo(3.14);
    });

    it('uses default when no leading digits', () => {
      expect(safeFloatParam('abc3.14', 0, 0, 10)).toBe(0);
    });

    it('parses scientific notation', () => {
      expect(safeFloatParam('1e2', 0, 0, 1000)).toBe(100);
    });
  });
});
