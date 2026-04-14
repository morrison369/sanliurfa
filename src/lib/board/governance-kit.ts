/**
 * Governance Kit - Stub Module
 * Provides base classes and utilities for governance coordinators
 */

// Signal Book Base Class
export class SignalBook<T> {
  protected signals: T[] = [];
  
  add(signal: T): void {
    this.signals.push(signal);
  }
  
  getAll(): T[] {
    return this.signals;
  }
  
  clear(): void {
    this.signals = [];
  }
}

// Score Computation Utilities
export function computeBalancedScore(...factors: number[]): number {
  if (factors.length === 0) return 0;
  const sum = factors.reduce((a, b) => a + b, 0);
  return sum / factors.length;
}

export function computeWeightedScore(scores: number[], weights: number[]): number {
  if (scores.length !== weights.length) return 0;
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
  return weightedSum / totalWeight;
}

// Routing Utilities
export function routeByThresholds(
  primary: number,
  secondary: number,
  highThreshold: number,
  lowThreshold: number,
  highRoute: string,
  balancedRoute: string,
  lowRoute: string
): string {
  if (primary >= highThreshold && secondary >= highThreshold) return highRoute;
  if (primary >= lowThreshold && secondary >= lowThreshold) return balancedRoute;
  return lowRoute;
}

export function routeToHandler(handlerId: string, signal: unknown): string {
  return `routed-to-${handlerId}`;
}

export function scorePasses(score: number, threshold: number): boolean {
  return score >= threshold;
}

// Report Building
export interface GovernanceReport {
  timestamp: Date;
  summary: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

export function buildGovernanceReport(
  title: string,
  metricsOrSignalId: Record<string, number> | string,
  recommendationsOrMetricName?: string[] | string,
  score?: number,
  description?: string,
  recommendations?: string[]
): GovernanceReport | any {
  if (typeof metricsOrSignalId === 'string') {
    // Called with expanded arguments: (title, signalId, metricName, score, description, recommendations?)
    const metrics: Record<string, number> = {};
    if (typeof recommendationsOrMetricName === 'string' && score !== undefined) {
      metrics[recommendationsOrMetricName] = score;
    }
    return {
      timestamp: new Date(),
      summary: title + (description ? ': ' + description : ''),
      metrics,
      recommendations: recommendations || []
    };
  }
  // Standard call: (title, metrics, recommendations?)
  return {
    timestamp: new Date(),
    summary: title,
    metrics: metricsOrSignalId,
    recommendations: (recommendationsOrMetricName as string[]) || []
  };
}

// Validation Utilities
export function validateSignal<T extends Record<string, number>>(
  signal: T,
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => field in signal && typeof signal[field] === 'number');
}

// Threshold Utilities
export function aboveThreshold(value: number, threshold: number): boolean {
  return value >= threshold;
}

export function belowThreshold(value: number, threshold: number): boolean {
  return value < threshold;
}

// Export types
export type SignalType = 'assurance' | 'resilience' | 'continuity' | 'stability';
export type RouteType = 'priority' | 'balanced' | 'deferred';

export interface BaseSignal {
  signalId: string;
  timestamp?: Date;
  priority?: number;
}

// Default exports for compatibility
export default {
  SignalBook,
  computeBalancedScore,
  computeWeightedScore,
  routeByThresholds,
  buildGovernanceReport,
  validateSignal
};
