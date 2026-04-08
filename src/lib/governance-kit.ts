export class SignalBook<T> {
  private signals: T[] = [];

  add(signal: T): T {
    this.signals.push(signal);
    return signal;
  }

  list(): T[] {
    return this.signals;
  }
}

export function computeBalancedScore(primary: number, secondary: number, cost: number): number {
  return Math.round((primary * 0.5 + secondary * 0.5 - cost) * 10) / 10;
}

export function routeByThresholds(
  highMetric: number,
  mediumMetric: number,
  highThreshold: number,
  mediumThreshold: number,
  highLabel: string,
  mediumLabel: string,
  reviewLabel: string
): string {
  if (highMetric >= highThreshold) return highLabel;
  if (mediumMetric >= mediumThreshold) return mediumLabel;
  return reviewLabel;
}

export function scorePasses(score: number, threshold: number): boolean {
  return score >= threshold;
}

export function buildGovernanceReport(
  prefix: string,
  signalId: string,
  field: string,
  value: string | number,
  logMessage: string
): string {
  const text = `${prefix} ${signalId} ${field}=${value}`;
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(logMessage, { signalId, [field]: value });
  }
  return text;
}
