/**
 * Unit Tests - place/lifecycle-events.ts getPendingSlaHours env-driven helper
 *
 * - PLACE_PENDING_SLA_HOURS env yok → 48 default
 * - geçerli sayı → değer (clamped 1-720)
 * - NaN/non-numeric → 48 default
 * - clamp: 0 → 1 (minimum); 1000 → 720 (maximum)
 *
 * vi.stubEnv + afterEach unstub.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { getPendingSlaHours } from '../place/lifecycle-events';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getPendingSlaHours', () => {
  it('env yok → 48 default', () => {
    expect(getPendingSlaHours()).toBe(48);
  });

  it('geçerli sayı 24 → 24', () => {
    vi.stubEnv('PLACE_PENDING_SLA_HOURS', '24');
    expect(getPendingSlaHours()).toBe(24);
  });

  it('non-numeric → 48 default (Number.isFinite guard)', () => {
    vi.stubEnv('PLACE_PENDING_SLA_HOURS', 'abc');
    expect(getPendingSlaHours()).toBe(48);
  });

  it('clamp - 0 → 1 (minimum 1 hour)', () => {
    vi.stubEnv('PLACE_PENDING_SLA_HOURS', '0');
    expect(getPendingSlaHours()).toBe(1);
  });

  it('clamp - 1000 → 720 (maximum 30 days)', () => {
    vi.stubEnv('PLACE_PENDING_SLA_HOURS', '1000');
    expect(getPendingSlaHours()).toBe(720);
  });

  it('clamp - 720 → 720 (boundary inclusive)', () => {
    vi.stubEnv('PLACE_PENDING_SLA_HOURS', '720');
    expect(getPendingSlaHours()).toBe(720);
  });

  it('boş string → 48 default (Number("") = 0 → clamp 1; ama env yok mantığı ile 48)', () => {
    vi.stubEnv('PLACE_PENDING_SLA_HOURS', '');
    // Helper: `Number(process.env.X || 48)` — boş string falsy → fallback 48
    expect(getPendingSlaHours()).toBe(48);
  });
});
