export type AdminStatusLevel = 'healthy' | 'degraded' | 'blocked';

export function classifyIntegrationStatus(options: {
  configuredCount: number;
  total: number;
  verificationHealthy?: boolean;
}): AdminStatusLevel {
  if (options.configuredCount <= 0) {
    return 'blocked';
  }

  if (options.configuredCount < options.total) {
    return 'degraded';
  }

  if (options.verificationHealthy === false) {
    return 'degraded';
  }

  return 'healthy';
}

export function classifyNightlyStatus(options: {
  available: boolean;
  outcome: string;
  successRatePercent: number | null;
}): AdminStatusLevel {
  if (!options.available || options.outcome === 'missing') {
    return 'blocked';
  }

  if (options.outcome !== 'success') {
    return 'degraded';
  }

  if (typeof options.successRatePercent === 'number' && options.successRatePercent < 80) {
    return 'degraded';
  }

  return 'healthy';
}

export function classifyReleaseGateStatus(options: {
  available: boolean;
  finalStatus: 'passed' | 'failed' | 'missing';
  failedStepCount: number;
}): AdminStatusLevel {
  if (!options.available || options.finalStatus === 'missing') {
    return 'blocked';
  }

  if (options.finalStatus === 'failed' || options.failedStepCount > 0) {
    return 'degraded';
  }

  return 'healthy';
}

export function classifyThresholdStatus(options: {
  blockedWhen: boolean;
  degradedWhen: boolean;
}): AdminStatusLevel {
  if (options.blockedWhen) {
    return 'blocked';
  }

  if (options.degradedWhen) {
    return 'degraded';
  }

  return 'healthy';
}

export function classifyOverallOpsStatus(levels: AdminStatusLevel[]): AdminStatusLevel {
  if (levels.includes('blocked')) {
    return 'blocked';
  }

  if (levels.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}
