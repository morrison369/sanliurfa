import { describe, expect, it } from 'vitest';
import { formatAdminDateTime } from '../admin-format';

describe('admin-format', () => {
  it('returns fallback for null values', () => {
    expect(formatAdminDateTime(null)).toBe('Henüz üretilmedi');
    expect(formatAdminDateTime(null, '-')).toBe('-');
  });

  it('returns raw value for invalid date strings', () => {
    expect(formatAdminDateTime('invalid-date')).toBe('invalid-date');
  });

  it('formats valid date strings with Turkish locale', () => {
    expect(formatAdminDateTime('2026-04-16T10:20:00.000Z')).toContain('2026');
  });
});
