import { describe, expect, it, vi } from 'vitest';

import {
  formatQuotaResetDate,
  getQuotaProgressColor,
  getQuotaWarningClass,
} from '../quota-usage';

describe('quota usage helpers', () => {
  it('maps progress colors by threshold', () => {
    expect(getQuotaProgressColor(25)).toBe('bg-green-500');
    expect(getQuotaProgressColor(55)).toBe('bg-blue-500');
    expect(getQuotaProgressColor(85)).toBe('bg-yellow-500');
    expect(getQuotaProgressColor(100)).toBe('bg-red-500');
  });

  it('maps warning classes by threshold', () => {
    expect(getQuotaWarningClass(30)).toBe('');
    expect(getQuotaWarningClass(85)).toContain('border-yellow-200');
    expect(getQuotaWarningClass(120)).toContain('border-red-200');
  });

  it('formats reset dates in tr locale', () => {
    const spy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('16.04.2026');

    expect(formatQuotaResetDate('2026-04-16T00:00:00.000Z')).toBe('16.04.2026');
    expect(formatQuotaResetDate(null)).toBe('');

    spy.mockRestore();
  });
});
