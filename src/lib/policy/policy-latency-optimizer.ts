/**
 * Phase 236: Policy Latency Optimizer
 */

import { logger } from '../logger';

export interface PolicyLatencySample {
  policyId: string;
  p50: number;
  p95: number;
}

class PolicyLatencyCollector {
  private samples: PolicyLatencySample[] = [];

  add(sample: PolicyLatencySample): PolicyLatencySample {
    this.samples.push(sample);
    return sample;
  }

  list(): PolicyLatencySample[] {
    return this.samples;
  }
}

class PolicyHotPathDetector {
  detect(samples: PolicyLatencySample[], p95Threshold: number): PolicyLatencySample[] {
    return samples.filter(s => s.p95 >= p95Threshold);
  }
}

class PolicyLatencyTuner {
  tune(sample: PolicyLatencySample, reductionRatio: number): PolicyLatencySample {
    const p95 = Math.max(0, Math.round(sample.p95 * (1 - reductionRatio) * 10) / 10);
    return { ...sample, p95 };
  }
}

class PolicyLatencyReporter {
  summary(samples: PolicyLatencySample[]): { count: number; avgP95: number } {
    const avgP95 = samples.length ? samples.reduce((a, b) => a + b.p95, 0) / samples.length : 0;
    logger.debug('Policy latency summary', { count: samples.length, avgP95 });
    return { count: samples.length, avgP95: Math.round(avgP95 * 10) / 10 };
  }
}

export const policyLatencyCollector = new PolicyLatencyCollector();
export const policyHotPathDetector = new PolicyHotPathDetector();
export const policyLatencyTuner = new PolicyLatencyTuner();
export const policyLatencyReporter = new PolicyLatencyReporter();

export {
  PolicyLatencyCollector,
  PolicyHotPathDetector,
  PolicyLatencyTuner,
  PolicyLatencyReporter
};

