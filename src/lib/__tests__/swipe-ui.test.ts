import { describe, expect, it } from 'vitest';
import { computeSwipeThreshold } from '../social/swipe-ui';

describe('computeSwipeThreshold', () => {
  it('returns fallback for invalid widths', () => {
    expect(computeSwipeThreshold(0)).toBe(160);
    expect(computeSwipeThreshold(-10)).toBe(160);
    expect(computeSwipeThreshold(Number.NaN)).toBe(160);
  });

  it('clamps small mobile widths to minimum threshold', () => {
    expect(computeSwipeThreshold(280)).toBe(110);
  });

  it('calculates proportional threshold for common widths', () => {
    expect(computeSwipeThreshold(390)).toBe(137);
    expect(computeSwipeThreshold(768)).toBe(269);
  });

  it('clamps very large widths to max threshold', () => {
    expect(computeSwipeThreshold(1600)).toBe(320);
  });
});

