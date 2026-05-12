/**
 * Unit Tests — safeJsonParse() helper
 *
 * Background: Batch #208 — `JSON.parse(cached as string)` pattern threw on already-parsed
 * objects (caused by getCache returning T, not string). safeJsonParse() defensive helper
 * was added to prevent this class of bug.
 *
 * Contract:
 * - null/undefined → fallback (default null)
 * - object/array → return as-is (already parsed)
 * - string + valid JSON → JSON.parse it
 * - string + invalid JSON → fallback (no throw)
 * - other types (number, boolean) → fallback
 */

import { describe, it, expect } from 'vitest';
import { safeJsonParse } from '../api';

describe('safeJsonParse — defensive JSON parser', () => {
  describe('null/undefined input', () => {
    it('returns fallback (null) for null input', () => {
      expect(safeJsonParse(null)).toBe(null);
    });

    it('returns fallback (null) for undefined input', () => {
      expect(safeJsonParse(undefined)).toBe(null);
    });

    it('returns custom fallback for null input', () => {
      expect(safeJsonParse(null, {})).toEqual({});
      expect(safeJsonParse(null, [])).toEqual([]);
      expect(safeJsonParse<{ x: number }>(undefined, { x: 0 })).toEqual({ x: 0 });
    });
  });

  describe('already-parsed object/array', () => {
    it('returns object as-is (does not re-parse)', () => {
      const obj = { a: 1, b: 'two' };
      expect(safeJsonParse(obj)).toBe(obj); // same reference
    });

    it('returns array as-is', () => {
      const arr = [1, 2, 3];
      expect(safeJsonParse(arr)).toBe(arr);
    });

    it('handles nested objects', () => {
      const nested = { user: { id: 1, profile: { name: 'X' } } };
      expect(safeJsonParse(nested)).toBe(nested);
    });
  });

  describe('valid JSON string', () => {
    it('parses object literal', () => {
      expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });

    it('parses array literal', () => {
      expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('parses primitives', () => {
      expect(safeJsonParse('123')).toBe(123);
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('false')).toBe(false);
      expect(safeJsonParse('null')).toBe(null);
      expect(safeJsonParse('"hello"')).toBe('hello');
    });

    it('parses nested structures', () => {
      const json = '{"users":[{"id":1},{"id":2}],"total":2}';
      expect(safeJsonParse(json)).toEqual({ users: [{ id: 1 }, { id: 2 }], total: 2 });
    });
  });

  describe('invalid JSON string', () => {
    it('returns fallback for unquoted string', () => {
      expect(safeJsonParse('hello')).toBe(null);
      expect(safeJsonParse('hello', 'fallback')).toBe('fallback');
    });

    it('returns fallback for malformed JSON', () => {
      expect(safeJsonParse('{a:1}')).toBe(null);
      expect(safeJsonParse('{"a":1')).toBe(null);
      expect(safeJsonParse('[1,2,')).toBe(null);
    });

    it('returns fallback for empty string', () => {
      expect(safeJsonParse('')).toBe(null);
    });

    it('does NOT throw on invalid input', () => {
      expect(() => safeJsonParse('not json')).not.toThrow();
      expect(() => safeJsonParse('{broken')).not.toThrow();
    });
  });

  describe('non-string non-object types', () => {
    it('returns fallback for number', () => {
      expect(safeJsonParse(123 as any)).toBe(null);
    });

    it('returns fallback for boolean', () => {
      expect(safeJsonParse(true as any)).toBe(null);
      expect(safeJsonParse(false as any)).toBe(null);
    });
  });

  describe('typed generic usage', () => {
    interface User {
      id: number;
      name: string;
    }

    it('preserves type via generic', () => {
      const result = safeJsonParse<User>('{"id":1,"name":"X"}');
      expect(result).toEqual({ id: 1, name: 'X' });
    });

    it('typed fallback', () => {
      const result = safeJsonParse<User>('invalid', { id: 0, name: 'default' });
      expect(result).toEqual({ id: 0, name: 'default' });
    });
  });
});
