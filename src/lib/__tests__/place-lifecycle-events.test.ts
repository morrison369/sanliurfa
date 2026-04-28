import { describe, expect, it } from 'vitest';
import { getPendingSlaHours } from '../place/lifecycle-events';

describe('place lifecycle events config', () => {
  it('returns sane default SLA hours', () => {
    delete process.env.PLACE_PENDING_SLA_HOURS;
    expect(getPendingSlaHours()).toBe(48);
  });

  it('clamps invalid SLA values', () => {
    process.env.PLACE_PENDING_SLA_HOURS = '-10';
    expect(getPendingSlaHours()).toBe(1);
    process.env.PLACE_PENDING_SLA_HOURS = '10000';
    expect(getPendingSlaHours()).toBe(720);
  });
});

