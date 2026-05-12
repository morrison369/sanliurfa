/**
 * Unit Tests — monitoring/error-tracking.ts (in-memory error store + capture/stats)
 *
 * - captureException (Error / string + severity default 'error' + stack/type fields + userId/context)
 * - getRecentErrors (severity filter + limit + sort newest first)
 * - getErrorStats (total + bySeverity counter + last24h)
 *
 * Singleton state shared (errorStore module-level).
 */

import { describe, it, expect } from 'vitest';
import {
  captureException,
  getRecentErrors,
  getErrorStats,
} from '../monitoring/error-tracking';

describe('captureException', () => {
  it('Error object — message + stack + type yakalar', () => {
    const id = captureException(new Error('test-1-error'));
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    const recent = getRecentErrors({ limit: 5 });
    const found = recent.find((e) => e.id === id);
    expect(found?.message).toBe('test-1-error');
    expect(found?.type).toBe('Error');
    expect(found?.stack).toBeDefined();
  });

  it('string error — type "Error" + no stack', () => {
    const id = captureException('plain-string-error-msg');
    const recent = getRecentErrors({ limit: 5 });
    const found = recent.find((e) => e.id === id);
    expect(found?.message).toBe('plain-string-error-msg');
    expect(found?.type).toBe('Error');
    expect(found?.stack).toBeUndefined();
  });

  it('default severity → "error"', () => {
    const id = captureException(new Error('default-sev-test'));
    const recent = getRecentErrors({ limit: 5 });
    const found = recent.find((e) => e.id === id);
    expect(found?.severity).toBe('error');
  });

  it('options.severity → custom severity', () => {
    const id = captureException(new Error('warn-test'), { severity: 'warning' });
    const recent = getRecentErrors({ limit: 10, severity: 'warning' });
    expect(recent.some((e) => e.id === id)).toBe(true);
  });

  it('options.userId → userId field', () => {
    const id = captureException(new Error('user-test'), { userId: 'u-123' });
    const found = getRecentErrors({ limit: 10 }).find((e) => e.id === id);
    expect(found?.userId).toBe('u-123');
  });

  it('options.context → context field', () => {
    const id = captureException(new Error('ctx-test'), { context: { requestId: 'req-1' } });
    const found = getRecentErrors({ limit: 10 }).find((e) => e.id === id);
    expect(found?.context?.requestId).toBe('req-1');
  });

  it('returns unique ID', () => {
    const id1 = captureException('a');
    const id2 = captureException('b');
    expect(id1).not.toBe(id2);
  });
});

describe('getRecentErrors', () => {
  it('default limit 50', () => {
    const r = getRecentErrors();
    expect(r.length).toBeLessThanOrEqual(50);
  });

  it('custom limit parametresi', () => {
    captureException('limit-test-1');
    captureException('limit-test-2');
    captureException('limit-test-3');
    expect(getRecentErrors({ limit: 2 })).toHaveLength(2);
  });

  it('severity filter', () => {
    captureException('fatal-test', { severity: 'fatal' });
    const fatals = getRecentErrors({ severity: 'fatal', limit: 100 });
    expect(fatals.every((e) => e.severity === 'fatal')).toBe(true);
  });

  it('newest first sort (desc timestamp)', () => {
    captureException('old');
    captureException('newer');
    const r = getRecentErrors({ limit: 5 });
    if (r.length >= 2) {
      const t0 = new Date(r[0].timestamp).getTime();
      const t1 = new Date(r[1].timestamp).getTime();
      expect(t0).toBeGreaterThanOrEqual(t1);
    }
  });
});

describe('getErrorStats', () => {
  it('total + bySeverity + last24h field structure', () => {
    captureException(new Error('stats-test'));
    const s = getErrorStats();
    expect(typeof s.total).toBe('number');
    expect(s.bySeverity).toHaveProperty('error');
    expect(s.bySeverity).toHaveProperty('warning');
    expect(s.bySeverity).toHaveProperty('fatal');
    expect(s.bySeverity).toHaveProperty('info');
    expect(s.bySeverity).toHaveProperty('debug');
    expect(typeof s.last24h).toBe('number');
  });

  it('bySeverity counter — fatal kaydı ekle', () => {
    const before = getErrorStats().bySeverity.fatal;
    captureException('fatal-counter-test', { severity: 'fatal' });
    const after = getErrorStats().bySeverity.fatal;
    expect(after).toBeGreaterThan(before);
  });

  it('last24h — yeni kayıt sayaca yansır', () => {
    const before = getErrorStats().last24h;
    captureException('24h-test');
    const after = getErrorStats().last24h;
    expect(after).toBeGreaterThan(before);
  });
});
