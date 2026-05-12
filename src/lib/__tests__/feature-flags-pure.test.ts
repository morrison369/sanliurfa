/**
 * Unit Tests — feature/feature-flags.ts FeatureFlagManager isEnabled (HARD RULE #49 SHA-256)
 *
 * - isEnabled — flag yok → false
 * - flag.enabled false → false (global disable)
 * - startDate/endDate window check
 * - context yok → rolloutPercentage >= 100 (anonim full rollout)
 * - allowedUsers / allowedGroups override
 * - SHA-256 deterministic bucket (HARD RULE #49)
 * - getAllFlags — Map iteration + isEnabled mapping
 *
 * Private flags Map — `(featureFlags as any).flags.set(...)` ile direct inject.
 * loadFlags / setFlag / deleteFlag DB-bağımlı, kapsam dışı.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, isFeatureEnabled, getEnabledFeatures } from '../feature/feature-flags';

const flagsMap = (featureFlags as any).flags as Map<string, any>;

beforeEach(() => {
  flagsMap.clear();
});

describe('FeatureFlagManager.isEnabled', () => {
  it('flag yok → false', () => {
    expect(featureFlags.isEnabled('non-existent')).toBe(false);
  });

  it('flag.enabled false → false (global disable)', () => {
    flagsMap.set('disabled-flag', { name: 'disabled-flag', enabled: false, rolloutPercentage: 100 });
    expect(featureFlags.isEnabled('disabled-flag')).toBe(false);
  });

  it('startDate gelecekte → false', () => {
    flagsMap.set('future-flag', {
      name: 'future-flag',
      enabled: true,
      rolloutPercentage: 100,
      startDate: new Date(Date.now() + 60000), // 1 dakika sonra
    });
    expect(featureFlags.isEnabled('future-flag')).toBe(false);
  });

  it('endDate geçti → false', () => {
    flagsMap.set('expired-flag', {
      name: 'expired-flag',
      enabled: true,
      rolloutPercentage: 100,
      endDate: new Date(Date.now() - 60000), // 1 dakika önce
    });
    expect(featureFlags.isEnabled('expired-flag')).toBe(false);
  });

  it('context yok + rollout 100 → true (full rollout)', () => {
    flagsMap.set('full-flag', { name: 'full-flag', enabled: true, rolloutPercentage: 100 });
    expect(featureFlags.isEnabled('full-flag')).toBe(true);
  });

  it('context yok + rollout < 100 → false (anonim percentage rollout dışı)', () => {
    flagsMap.set('partial-flag', { name: 'partial-flag', enabled: true, rolloutPercentage: 50 });
    expect(featureFlags.isEnabled('partial-flag')).toBe(false);
  });

  it('allowedUsers — userId match → true', () => {
    flagsMap.set('user-flag', {
      name: 'user-flag',
      enabled: true,
      rolloutPercentage: 0, // 0 ama allowedUsers override eder
      allowedUsers: ['u-1'],
    });
    expect(featureFlags.isEnabled('user-flag', { userId: 'u-1' })).toBe(true);
    expect(featureFlags.isEnabled('user-flag', { userId: 'u-other' })).toBe(false);
  });

  it('allowedGroups — group match → true', () => {
    flagsMap.set('group-flag', {
      name: 'group-flag',
      enabled: true,
      rolloutPercentage: 0,
      allowedGroups: ['admin', 'beta'],
    });
    expect(featureFlags.isEnabled('group-flag', { userId: 'u-x', groups: ['beta'] })).toBe(true);
    expect(featureFlags.isEnabled('group-flag', { userId: 'u-x', groups: ['user'] })).toBe(false);
  });

  it('SHA-256 deterministic — aynı userId+flagName → aynı sonuç (HARD RULE #49)', () => {
    flagsMap.set('det-flag', { name: 'det-flag', enabled: true, rolloutPercentage: 50 });
    const ctx = { userId: 'u-deterministic-1' };
    const r1 = featureFlags.isEnabled('det-flag', ctx);
    const r2 = featureFlags.isEnabled('det-flag', ctx);
    const r3 = featureFlags.isEnabled('det-flag', ctx);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('rollout 0% → tüm userId false (anonim hariç)', () => {
    flagsMap.set('zero-flag', { name: 'zero-flag', enabled: true, rolloutPercentage: 0 });
    expect(featureFlags.isEnabled('zero-flag', { userId: 'u-1' })).toBe(false);
  });

  it('rollout 100% + userId → true (bucket < 100 daima)', () => {
    flagsMap.set('hundred-flag', { name: 'hundred-flag', enabled: true, rolloutPercentage: 100 });
    expect(featureFlags.isEnabled('hundred-flag', { userId: 'u-h' })).toBe(true);
  });
});

describe('FeatureFlagManager.getAllFlags', () => {
  it('flag listesi boş → empty record', () => {
    expect(featureFlags.getAllFlags()).toEqual({});
  });

  it('multiple flags + context → name → boolean map', () => {
    flagsMap.set('a', { name: 'a', enabled: true, rolloutPercentage: 100 });
    flagsMap.set('b', { name: 'b', enabled: false, rolloutPercentage: 100 });
    const all = featureFlags.getAllFlags();
    expect(all.a).toBe(true);
    expect(all.b).toBe(false);
  });
});

describe('helper exports — isFeatureEnabled / getEnabledFeatures', () => {
  it('isFeatureEnabled delegate — featureFlags.isEnabled', () => {
    flagsMap.set('helper-flag', { name: 'helper-flag', enabled: true, rolloutPercentage: 100 });
    expect(isFeatureEnabled('helper-flag')).toBe(true);
  });

  it('getEnabledFeatures delegate — featureFlags.getAllFlags', () => {
    flagsMap.set('h2', { name: 'h2', enabled: true, rolloutPercentage: 100 });
    expect(getEnabledFeatures().h2).toBe(true);
  });
});
