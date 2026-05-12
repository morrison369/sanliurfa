/**
 * Unit Tests - realtime/realtime-control-saturation-monitor.ts (Phase 241)
 *
 * - SaturationTelemetryBuffer (push + list)
 * - SaturationRatioCalculator (load/capacity + capacity 0 guard + Math.round 0.001 precision)
 * - SaturationThresholdGuard (ratio >= threshold)
 * - SaturationAlertPublisher (text template)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  saturationTelemetryBuffer,
  saturationRatioCalculator,
  saturationThresholdGuard,
  saturationAlertPublisher,
} from '../realtime/realtime-control-saturation-monitor';

describe('SaturationTelemetryBuffer', () => {
  it('push - sample list eklenir', () => {
    const before = saturationTelemetryBuffer.list().length;
    saturationTelemetryBuffer.push({ controlId: `c-${Date.now()}`, load: 50, capacity: 100 });
    expect(saturationTelemetryBuffer.list().length).toBe(before + 1);
  });

  it('push - return value sample', () => {
    const sample = saturationTelemetryBuffer.push({ controlId: 'c-x', load: 10, capacity: 20 });
    expect(sample.controlId).toBe('c-x');
    expect(sample.load).toBe(10);
  });
});

describe('SaturationRatioCalculator', () => {
  it('ratio - load/capacity + Math.round 0.001 precision', () => {
    const r = saturationRatioCalculator.ratio({ controlId: 'c', load: 33, capacity: 100 });
    expect(r).toBe(0.33);
  });

  it('ratio - capacity 0 → 0 (division guard)', () => {
    const r = saturationRatioCalculator.ratio({ controlId: 'c', load: 50, capacity: 0 });
    expect(r).toBe(0);
  });

  it('ratio - load > capacity → > 1 (overload)', () => {
    const r = saturationRatioCalculator.ratio({ controlId: 'c', load: 150, capacity: 100 });
    expect(r).toBe(1.5);
  });

  it('ratio - precision 3 decimal (0.001)', () => {
    const r = saturationRatioCalculator.ratio({ controlId: 'c', load: 1, capacity: 3 });
    expect(r).toBe(0.333); // 1/3 = 0.3333... → round(*1000)/1000
  });
});

describe('SaturationThresholdGuard', () => {
  it('breached - ratio >= threshold → true', () => {
    expect(saturationThresholdGuard.breached(0.8, 0.7)).toBe(true);
    expect(saturationThresholdGuard.breached(0.7, 0.7)).toBe(true); // inclusive
  });

  it('breached - ratio < threshold → false', () => {
    expect(saturationThresholdGuard.breached(0.5, 0.7)).toBe(false);
  });
});

describe('SaturationAlertPublisher', () => {
  it('publish - text template "Control X saturation ratio Y."', () => {
    const r = saturationAlertPublisher.publish('control-1', 0.95);
    expect(r).toBe('Control control-1 saturation ratio 0.95.');
  });

  it('publish - 0 ratio', () => {
    expect(saturationAlertPublisher.publish('c', 0)).toContain('ratio 0');
  });
});
