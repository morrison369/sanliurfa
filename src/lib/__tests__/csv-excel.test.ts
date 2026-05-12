/**
 * Unit Tests — CSV parser/generator
 *
 * Pure helpers — no mock needed. Round-trip tests + edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, generateCSV } from '../csv-excel';

describe('parseCSV', () => {
  it('parses simple CSV with header', async () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const result = await parseCSV(csv);
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('returns empty array for empty input', async () => {
    expect(await parseCSV('')).toEqual([]);
  });

  it('returns empty array for header-only CSV', async () => {
    expect(await parseCSV('name,age')).toEqual([]);
  });

  it('handles trailing newlines', async () => {
    const csv = 'name\nAlice\n\n';
    const result = await parseCSV(csv);
    expect(result).toEqual([{ name: 'Alice' }]);
  });

  it('handles CRLF line endings (Windows)', async () => {
    const csv = 'name,age\r\nAlice,30\r\nBob,25';
    const result = await parseCSV(csv);
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('trims whitespace from headers and values', async () => {
    const csv = ' name , age \n  Alice , 30 ';
    const result = await parseCSV(csv);
    expect(result[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('uses empty string for missing values', async () => {
    const csv = 'name,age,city\nAlice,30';
    const result = await parseCSV(csv);
    expect(result[0]).toEqual({ name: 'Alice', age: '30', city: '' });
  });

  it('parses single-column CSV', async () => {
    const csv = 'email\nuser1@test.co\nuser2@test.co';
    const result = await parseCSV(csv);
    expect(result).toEqual([
      { email: 'user1@test.co' },
      { email: 'user2@test.co' },
    ]);
  });
});

describe('generateCSV', () => {
  it('generates CSV with header from first row keys', () => {
    const csv = generateCSV([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    expect(csv).toBe('name,age\nAlice,30\nBob,25');
  });

  it('returns empty string for empty array', () => {
    expect(generateCSV([])).toBe('');
  });

  it('handles null/undefined values as empty string', () => {
    const csv = generateCSV([{ name: 'X', age: null, city: undefined }]);
    expect(csv).toBe('name,age,city\nX,,');
  });

  it('replaces commas in values with spaces (basic CSV injection prevention)', () => {
    const csv = generateCSV([{ name: 'Alice, Bob', city: 'NYC' }]);
    // Commas in values become spaces — caller alternative: full quote escaping
    expect(csv).toContain('Alice  Bob'); // ", " → "  " (2 spaces)
  });

  it('coerces numbers / booleans to string', () => {
    const csv = generateCSV([{ active: true, count: 42, ratio: 3.14 }]);
    expect(csv).toBe('active,count,ratio\ntrue,42,3.14');
  });

  it('uses first row keys as headers (subsequent rows align by key)', () => {
    const csv = generateCSV([
      { a: 1, b: 2 },
      { a: 3, b: 4, c: 5 }, // 'c' ignored — not in first row
    ]);
    expect(csv).toBe('a,b\n1,2\n3,4');
  });

  it('preserves key order from first row', () => {
    const csv = generateCSV([{ z: 'last', a: 'first' }]);
    expect(csv).toMatch(/^z,a\n/);
  });
});

describe('parseCSV ↔ generateCSV round-trip', () => {
  it('round-trips simple data', async () => {
    const original = [
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ];
    const csv = generateCSV(original);
    const parsed = await parseCSV(csv);
    expect(parsed).toEqual(original);
  });

  it('round-trips single column', async () => {
    const original = [{ email: 'a@b.co' }, { email: 'c@d.co' }];
    const csv = generateCSV(original);
    const parsed = await parseCSV(csv);
    expect(parsed).toEqual(original);
  });
});
