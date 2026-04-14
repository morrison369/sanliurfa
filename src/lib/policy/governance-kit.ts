/**
 * Governance Kit - Re-export from board with additional exports
 */

export {
  SignalBook,
  computeBalancedScore,
  computeWeightedScore,
  routeByThresholds,
  routeToHandler,
  buildGovernanceReport,
  validateSignal,
  aboveThreshold,
  belowThreshold,
  type SignalType,
  type RouteType,
  type BaseSignal,
  type GovernanceReport
} from '../board/governance-kit';

/**
 * Check if a score passes a threshold
 */
export function scorePasses(score: number, threshold: number): boolean {
  return score >= threshold;
}
