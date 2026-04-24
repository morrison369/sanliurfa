/**
 * Governance Kit Stub
 * Placeholder for missing governance-kit exports
 */

export class SignalBook<T> {
  private signals: T[] = [];
  add(signal: T): void { this.signals.push(signal); }
  getAll(): T[] { return this.signals; }
}

export function computeBalancedScore(...factors: number[]): number {
  return factors.reduce((a, b) => a + b, 0) / factors.length || 0;
}

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

export function scorePasses(score: number, threshold: number): boolean {
  return score >= threshold;
}

export function buildGovernanceReport(
  title: string,
  signalIdOrMetrics: string | Record<string, number>,
  metricNameOrRecs?: string | string[],
  score?: number,
  description?: string,
  recommendations?: string[]
): any {
  if (typeof signalIdOrMetrics === 'string') {
    // Called with (title, signalId, metricName, score, description, recommendations?)
    return { 
      title, 
      signalId: signalIdOrMetrics, 
      metricName: metricNameOrRecs, 
      score,
      description,
      recommendations: recommendations || [], 
      timestamp: new Date() 
    };
  }
  // Called with (title, metrics, recommendations?)
  return { title, metrics: signalIdOrMetrics, recommendations: metricNameOrRecs || [], timestamp: new Date() };
}

export function validateSignal<T extends Record<string, number>>(
  signal: T,
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => field in signal && typeof signal[field] === 'number');
}

export function computeWeightedScore(scores: number[], weights: number[]): number {
  if (scores.length !== weights.length) return 0;
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
  return weightedSum / totalWeight;
}

export function routeToHandler(handlerId: string, _signal: unknown): string {
  return `routed-to-${handlerId}`;
}

export function aboveThreshold(value: number, threshold: number): boolean {
  return value >= threshold;
}

export function belowThreshold(value: number, threshold: number): boolean {
  return value < threshold;
}

export type SignalType = 'assurance' | 'resilience' | 'continuity' | 'stability';
export type RouteType = 'priority' | 'balanced' | 'deferred';

export interface BaseSignal {
  signalId: string;
  timestamp?: Date;
  priority?: number;
}
