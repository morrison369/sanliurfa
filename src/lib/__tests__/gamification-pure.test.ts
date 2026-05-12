/**
 * Unit Tests - gamification/gamification.ts pure level calculator
 *
 * - calculateUserLevel (LEVEL_THRESHOLDS [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000])
 * - 0 points → level 1; 100 → level 2; 300 → level 3; 50000 → level 10
 * - getLevelProgress (currentLevel + nextLevel + currentThreshold + nextThreshold + progressPercent 0-100)
 * - max level handling (50000+ → +50000 next threshold extrapolation)
 *
 * Pure functions on number input - no DB mock needed.
 */

import { describe, it, expect } from 'vitest';
import { calculateUserLevel, getLevelProgress } from '../gamification/gamification';

describe('calculateUserLevel', () => {
  it('0 points - level 1', () => {
    expect(calculateUserLevel(0)).toBe(1);
  });

  it('99 points - level 1 (below threshold 100)', () => {
    expect(calculateUserLevel(99)).toBe(1);
  });

  it('100 points - level 2 (boundary inclusive)', () => {
    expect(calculateUserLevel(100)).toBe(2);
  });

  it('299 - level 2; 300 - level 3', () => {
    expect(calculateUserLevel(299)).toBe(2);
    expect(calculateUserLevel(300)).toBe(3);
  });

  it('700 - level 4; 1500 - level 5', () => {
    expect(calculateUserLevel(700)).toBe(4);
    expect(calculateUserLevel(1500)).toBe(5);
  });

  it('3000 - level 6; 6000 - level 7', () => {
    expect(calculateUserLevel(3000)).toBe(6);
    expect(calculateUserLevel(6000)).toBe(7);
  });

  it('12000 - level 8; 25000 - level 9', () => {
    expect(calculateUserLevel(12000)).toBe(8);
    expect(calculateUserLevel(25000)).toBe(9);
  });

  it('50000 - level 10 (max threshold)', () => {
    expect(calculateUserLevel(50000)).toBe(10);
  });

  it('100000 - level 10 (max cap, no level 11)', () => {
    expect(calculateUserLevel(100000)).toBe(10);
  });

  it('negative points - level 1 (defensive fallback)', () => {
    expect(calculateUserLevel(-100)).toBe(1);
  });
});

describe('getLevelProgress', () => {
  it('0 points - level 1, next 2, threshold 0→100, 0% progress', () => {
    const r = getLevelProgress(0);
    expect(r.currentLevel).toBe(1);
    expect(r.nextLevel).toBe(2);
    expect(r.currentThreshold).toBe(0);
    expect(r.nextThreshold).toBe(100);
    expect(r.progressPercent).toBe(0);
  });

  it('50 points - level 1, 50% progress (50/100)', () => {
    const r = getLevelProgress(50);
    expect(r.currentLevel).toBe(1);
    expect(r.progressPercent).toBe(50);
  });

  it('100 points - level 2, next 3, threshold 100→300', () => {
    const r = getLevelProgress(100);
    expect(r.currentLevel).toBe(2);
    expect(r.nextLevel).toBe(3);
    expect(r.currentThreshold).toBe(100);
    expect(r.nextThreshold).toBe(300);
  });

  it('200 points - level 2, 50% progress (100/200 of bracket)', () => {
    const r = getLevelProgress(200);
    expect(r.currentLevel).toBe(2);
    // (200 - 100) / (300 - 100) = 100/200 = 50%
    expect(r.progressPercent).toBe(50);
  });

  it('50000 points - level 10 (max), nextThreshold extrapolation +50000', () => {
    const r = getLevelProgress(50000);
    expect(r.currentLevel).toBe(10);
    expect(r.nextThreshold).toBeGreaterThan(50000);
  });

  it('progressPercent always 0-100 range', () => {
    for (const points of [0, 50, 100, 500, 1000, 25000, 100000]) {
      const r = getLevelProgress(points);
      expect(r.progressPercent).toBeGreaterThanOrEqual(0);
      expect(r.progressPercent).toBeLessThanOrEqual(100);
    }
  });
});
