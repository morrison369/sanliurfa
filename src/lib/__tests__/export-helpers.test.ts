/**
 * Unit Tests — export/export.ts pure data export helpers
 *
 * - convertToCSV (header row + escape quote "" + null/undefined → empty + object → JSON.stringify)
 * - convertToJSON (JSON.stringify indent 2)
 * - getContentType (csv → text/csv; default JSON)
 * - getFileExtension (csv → 'csv'; default 'json')
 * - getFormattedDate (ISO YYYY-MM-DD format)
 */

import { describe, it, expect } from 'vitest';
import {
  convertToCSV,
  convertToJSON,
  getContentType,
  getFileExtension,
  getFormattedDate,
} from '../export/export';

describe('convertToCSV', () => {
  it('boş array → boş string', () => {
    expect(convertToCSV([])).toBe('');
  });

  it('header row + data row format', () => {
    const csv = convertToCSV([{ name: 'Ali', age: 30 }]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"name","age"');
    expect(lines[1]).toBe('"Ali","30"');
  });

  it('null / undefined → empty string', () => {
    const csv = convertToCSV([{ a: null, b: undefined, c: 'val' }]);
    expect(csv.split('\n')[1]).toBe(',,"val"');
  });

  it('quote escape — "" double-quote', () => {
    const csv = convertToCSV([{ name: 'Say "Hi"' }]);
    expect(csv).toContain('""Hi""');
  });

  it('object value → JSON.stringify', () => {
    const csv = convertToCSV([{ data: { foo: 'bar' } }]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('foo');
    expect(lines[1]).toContain('bar');
  });

  it('multiple rows', () => {
    const csv = convertToCSV([{ x: 1 }, { x: 2 }, { x: 3 }]);
    expect(csv.split('\n')).toHaveLength(4); // 1 header + 3 data
  });
});

describe('convertToJSON', () => {
  it('JSON.stringify with 2-space indent', () => {
    const json = convertToJSON([{ name: 'Ali' }]);
    expect(json).toBe('[\n  {\n    "name": "Ali"\n  }\n]');
  });

  it('boş array → "[]"', () => {
    expect(convertToJSON([])).toBe('[]');
  });
});

describe('getContentType', () => {
  it('csv → text/csv', () => {
    expect(getContentType('csv')).toBe('text/csv');
  });

  it('default → application/json', () => {
    expect(getContentType('json')).toBe('application/json');
    expect(getContentType('xml')).toBe('application/json'); // default fallback
  });
});

describe('getFileExtension', () => {
  it('csv → "csv"', () => {
    expect(getFileExtension('csv')).toBe('csv');
  });

  it('default → "json"', () => {
    expect(getFileExtension('json')).toBe('json');
    expect(getFileExtension('anything')).toBe('json');
  });
});

describe('getFormattedDate', () => {
  it('ISO date YYYY-MM-DD format', () => {
    const date = getFormattedDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('today\'s date (length 10)', () => {
    expect(getFormattedDate().length).toBe(10);
  });
});
