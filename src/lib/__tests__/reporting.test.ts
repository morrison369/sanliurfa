import { describe, it, expect } from 'vitest';
import { reportToCSV, reportToJSON } from '../reporting/reporting';

describe('reportToCSV', () => {
  it('returns an empty string for an empty input', () => {
    expect(reportToCSV([])).toBe('');
  });

  it('emits a header row derived from the first row keys', () => {
    const csv = reportToCSV([{ name: 'Ali', age: 30 }]);
    const [header] = csv.split('\n');
    expect(header).toBe('name,age');
  });

  it('quotes values that contain commas or newlines', () => {
    const csv = reportToCSV([{ description: 'hello, world', note: 'line1\nline2' }]);
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"line1\nline2"');
  });

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const csv = reportToCSV([{ quote: 'she said "hi"' }]);
    expect(csv).toContain('"she said ""hi"""');
  });

  it('renders null/undefined cells as empty strings without quotes', () => {
    const csv = reportToCSV([{ a: 1, b: null, c: undefined }]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('1,,');
  });
});

describe('reportToJSON', () => {
  it('produces 2-space indented JSON for human readability', () => {
    const out = reportToJSON({ a: 1, b: { c: 2 } });
    expect(out).toBe('{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}');
  });
});
