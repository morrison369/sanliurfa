/**
 * Unit Tests — usage/tracking.ts UsageTracker
 *
 * track + getUsage (filter user/feature) + getStats (feature aggregate count)
 */

import { describe, it, expect } from 'vitest';
import { UsageTracker, usageTracker } from '../usage/tracking';

describe('UsageTracker', () => {
  it('track — event eklenir', () => {
    const t = new UsageTracker();
    t.track('u1', 'feature-a');
    expect(t.getUsage('u1')).toBe(1);
  });

  it('track — metadata optional', () => {
    const t = new UsageTracker();
    t.track('u1', 'f1');
    t.track('u1', 'f2', { source: 'web' });
    expect(t.getUsage('u1')).toBe(2);
  });

  it('getUsage — userId filter', () => {
    const t = new UsageTracker();
    t.track('u1', 'f');
    t.track('u2', 'f');
    expect(t.getUsage('u1')).toBe(1);
    expect(t.getUsage('u2')).toBe(1);
  });

  it('getUsage — feature filter', () => {
    const t = new UsageTracker();
    t.track('u1', 'feat-a');
    t.track('u1', 'feat-b');
    t.track('u1', 'feat-a');
    expect(t.getUsage('u1', 'feat-a')).toBe(2);
    expect(t.getUsage('u1', 'feat-b')).toBe(1);
  });

  it('getUsage — bilinmeyen user → 0', () => {
    expect(new UsageTracker().getUsage('non-existent')).toBe(0);
  });

  it('getStats — feature count aggregate', () => {
    const t = new UsageTracker();
    t.track('u1', 'a');
    t.track('u1', 'a');
    t.track('u2', 'b');
    const stats = t.getStats();
    expect(stats.a).toBe(2);
    expect(stats.b).toBe(1);
  });

  it('getStats — boş → boş object', () => {
    expect(new UsageTracker().getStats()).toEqual({});
  });

  it('singleton usageTracker exported', () => {
    expect(usageTracker).toBeInstanceOf(UsageTracker);
  });
});
