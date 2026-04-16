import { describe, expect, it } from 'vitest';
import {
  formatAdminIndexGeneratedAt,
  getAdminIndexRiskCardClass,
  getAdminIndexStatusBadgeClass,
} from '../admin-index-page';

describe('admin index page helpers', () => {
  it('maps status badge classes', () => {
    expect(getAdminIndexStatusBadgeClass('healthy')).toContain('text-green-700');
    expect(getAdminIndexStatusBadgeClass('degraded')).toContain('text-amber-700');
    expect(getAdminIndexStatusBadgeClass('blocked')).toContain('text-red-700');
  });

  it('maps risk card classes', () => {
    expect(getAdminIndexRiskCardClass('healthy')).toContain('border-transparent');
    expect(getAdminIndexRiskCardClass('degraded')).toContain('border-amber-200');
    expect(getAdminIndexRiskCardClass('blocked')).toContain('border-red-200');
  });

  it('formats generatedAt values for admin index cards', () => {
    expect(formatAdminIndexGeneratedAt(null)).toBe('Henüz üretilmedi');
    expect(formatAdminIndexGeneratedAt('invalid-date')).toBe('invalid-date');
    expect(formatAdminIndexGeneratedAt('2026-04-16T10:20:00.000Z')).toContain('2026');
  });
});
