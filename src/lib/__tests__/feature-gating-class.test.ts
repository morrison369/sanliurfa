/**
 * Unit Tests — feature/gating.ts FeatureGating class
 *
 * Note: lib/feature-gating.ts (Batch #254 stub) ayrı module.
 * Bu rich version: SHA-256 percentage rollout (HARD RULE #49 uyumlu) +
 * user allowlist + global enable/disable.
 */

import { describe, it, expect } from 'vitest';
import { FeatureGating, featureGating } from '../feature/gating';

describe('FeatureGating class', () => {
  it('register + isEnabled — global enabled flag', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'feat1', enabled: true });
    expect(fg.isEnabled('feat1')).toBe(true);
  });

  it('isEnabled — bilinmeyen feature → false', () => {
    expect(new FeatureGating().isEnabled('non-existent')).toBe(false);
  });

  it('isEnabled — enabled:false → false (global kapalı)', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'disabled-feat', enabled: false });
    expect(fg.isEnabled('disabled-feat')).toBe(false);
  });

  it('isEnabled — users allowlist + userId match → true', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'allow-feat', enabled: true, users: ['u1', 'u2'] });
    expect(fg.isEnabled('allow-feat', 'u1')).toBe(true);
    expect(fg.isEnabled('allow-feat', 'u2')).toBe(true);
  });

  it('isEnabled — users allowlist + userId yok → false', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'allow-only', enabled: true, users: ['u1'] });
    expect(fg.isEnabled('allow-only', 'u-other')).toBe(false);
  });

  it('isEnabled — percentage rollout deterministic SHA-256 (HARD RULE #49)', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'pct50', enabled: true, percentage: 50 });
    // Aynı user → aynı sonuç (deterministic)
    const r1 = fg.isEnabled('pct50', 'user-x');
    const r2 = fg.isEnabled('pct50', 'user-x');
    expect(r1).toBe(r2);
  });

  it('isEnabled — percentage 0 → false her zaman', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'pct0', enabled: true, percentage: 0 });
    for (const u of ['u1', 'u2', 'u3']) {
      expect(fg.isEnabled('pct0', u)).toBe(false);
    }
  });

  it('isEnabled — percentage 100 → tüm logged-in user true', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'pct100', enabled: true, percentage: 100 });
    for (const u of ['u1', 'u2', 'u3']) {
      expect(fg.isEnabled('pct100', u)).toBe(true);
    }
  });

  it('isEnabled — percentage + userId yok → false (anonim hariç)', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'pct-anon', enabled: true, percentage: 50 });
    expect(fg.isEnabled('pct-anon')).toBe(false);
  });

  it('isEnabled — enabled + no users + no percentage → true (default open)', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'open-feat', enabled: true });
    expect(fg.isEnabled('open-feat')).toBe(true);
    expect(fg.isEnabled('open-feat', 'u1')).toBe(true);
  });

  it('getFlag — flag obj veya undefined', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'x', enabled: true });
    expect(fg.getFlag('x')?.enabled).toBe(true);
    expect(fg.getFlag('non-existent')).toBeUndefined();
  });

  it('singleton featureGating exported', () => {
    expect(featureGating).toBeInstanceOf(FeatureGating);
  });

  it('register — aynı name overwrite', () => {
    const fg = new FeatureGating();
    fg.register({ name: 'over', enabled: true });
    fg.register({ name: 'over', enabled: false });
    expect(fg.isEnabled('over')).toBe(false);
  });
});
