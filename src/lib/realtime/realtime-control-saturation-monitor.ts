/**
 * Phase 241: Real-Time Control Saturation Monitor
 */

import { logger } from '../logger';

export interface ControlLoadSample {
  controlId: string;
  load: number;
  capacity: number;
}

class SaturationTelemetryBuffer {
  private samples: ControlLoadSample[] = [];

  push(sample: ControlLoadSample): ControlLoadSample {
    this.samples.push(sample);
    return sample;
  }

  list(): ControlLoadSample[] {
    return this.samples;
  }
}

class SaturationRatioCalculator {
  ratio(sample: ControlLoadSample): number {
    return sample.capacity === 0 ? 0 : Math.round((sample.load / sample.capacity) * 1000) / 1000;
  }
}

class SaturationThresholdGuard {
  breached(ratio: number, threshold: number): boolean {
    return ratio >= threshold;
  }
}

class SaturationAlertPublisher {
  publish(controlId: string, ratio: number): string {
    const text = `Control ${controlId} saturation ratio ${ratio}.`;
    logger.debug('Saturation alert published', { controlId, ratio });
    return text;
  }
}

export const saturationTelemetryBuffer = new SaturationTelemetryBuffer();
export const saturationRatioCalculator = new SaturationRatioCalculator();
export const saturationThresholdGuard = new SaturationThresholdGuard();
export const saturationAlertPublisher = new SaturationAlertPublisher();

export type {
  SaturationTelemetryBuffer,
  SaturationRatioCalculator,
  SaturationThresholdGuard,
  SaturationAlertPublisher
};