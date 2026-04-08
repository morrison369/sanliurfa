/**
 * Phase 29: Fraud Detection & Risk Management
 * Risk scoring, anomaly-based fraud detection, configurable fraud rules
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface RiskSignal {
  type: string;
  value: any;
  weight: number;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  blocked: boolean;
}

export interface FraudRule {
  id: string;
  name: string;
  condition: (signals: RiskSignal[]) => boolean;
  action: 'flag' | 'block' | 'review';
  score: number;
  enabled: boolean;
}

export interface FraudIncident {
  id: string;
  userId?: string;
  riskScore: number;
  signals: RiskSignal[];
  action: string;
  timestamp: number;
}

// ==================== RISK SCORER ====================

export class RiskScorer {
  private signals: RiskSignal[] = [];

  /**
   * Add risk signal
   */
  addSignal(signal: RiskSignal): void {
    this.signals.push(signal);
  }

  /**
   * Assess risk from signals
   */
  assess(signals: RiskSignal[]): RiskAssessment {
    const score = this.calculateScore(signals);
    const level = this.getLevel(score);
    const blocked = level === 'critical';

    return {
      score,
      level,
      signals,
      blocked
    };
  }

  /**
   * Calculate risk score from signals
   */
  private calculateScore(signals: RiskSignal[]): number {
    let score = 0;

    for (const signal of signals) {
      // Scoring based on signal type
      switch (signal.type) {
        case 'repeated_failed_login':
          score += signal.value * 15 * signal.weight;
          break;
        case 'velocity_check':
          // Multiple transactions in short time
          score += signal.value * 20 * signal.weight;
          break;
        case 'location_anomaly':
          // Unusual geographic location
          score += signal.value * 25 * signal.weight;
          break;
        case 'amount_anomaly':
          // Amount significantly higher than average
          score += signal.value * 18 * signal.weight;
          break;
        case 'device_change':
          // New device login
          score += signal.value * 10 * signal.weight;
          break;
        case 'suspicious_pattern':
          score += signal.value * 30 * signal.weight;
          break;
        default:
          score += signal.value * 5 * signal.weight;
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Get risk level
   */
  getLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
}

// ==================== FRAUD RULE ENGINE ====================

export class FraudRuleEngine {
  private rules = new Map<string, FraudRule>();

  /**
   * Register fraud rule
   */
  registerRule(rule: FraudRule): void {
    this.rules.set(rule.id, { ...rule, enabled: true });
    logger.debug('Fraud rule registered', { id: rule.id, name: rule.name });
  }

  /**
   * Evaluate signals against rules
   */
  evaluate(signals: RiskSignal[]): { action: string; triggeredRules: string[] } {
    const triggered: string[] = [];
    let maxAction = 'none';
    const actionPriority = { block: 3, review: 2, flag: 1, none: 0 };

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(signals)) {
          triggered.push(ruleId);

          if (actionPriority[rule.action as keyof typeof actionPriority] > actionPriority[maxAction as keyof typeof actionPriority]) {
            maxAction = rule.action;
          }
        }
      } catch (err) {
        logger.error('Fraud rule evaluation error', err instanceof Error ? err : new Error(String(err)), { ruleId });
      }
    }

    return {
      action: maxAction,
      triggeredRules: triggered
    };
  }

  /**
   * List all rules
   */
  listRules(): FraudRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable/disable rule
   */
  enableRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }
}

// ==================== FRAUD MONITOR ====================

export class FraudMonitor {
  private incidents: FraudIncident[] = [];
  private readonly maxHistory = 10000;

  /**
   * Record fraud incident
   */
  recordIncident(incident: FraudIncident): void {
    this.incidents.push(incident);

    if (this.incidents.length > this.maxHistory) {
      this.incidents.shift();
    }

    logger.warn('Fraud incident recorded', {
      id: incident.id,
      userId: incident.userId,
      riskScore: incident.riskScore,
      action: incident.action
    });
  }

  /**
   * Get incidents
   */
  getIncidents(userId?: string, limit: number = 50): FraudIncident[] {
    let filtered = this.incidents;

    if (userId) {
      filtered = filtered.filter(i => i.userId === userId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    blocked: number;
    flagged: number;
    reviewed: number;
    avgScore: number;
  } {
    if (this.incidents.length === 0) {
      return { total: 0, blocked: 0, flagged: 0, reviewed: 0, avgScore: 0 };
    }

    const blocked = this.incidents.filter(i => i.action === 'block').length;
    const flagged = this.incidents.filter(i => i.action === 'flag').length;
    const reviewed = this.incidents.filter(i => i.action === 'review').length;
    const avgScore = this.incidents.reduce((sum, i) => sum + i.riskScore, 0) / this.incidents.length;

    return {
      total: this.incidents.length,
      blocked,
      flagged,
      reviewed,
      avgScore: Math.round(avgScore)
    };
  }

  /**
   * Get high-risk users
   */
  getHighRiskUsers(minScore: number = 70, limit: number = 20): string[] {
    const userScores = new Map<string, number[]>();

    for (const incident of this.incidents) {
      if (!incident.userId) continue;

      if (!userScores.has(incident.userId)) {
        userScores.set(incident.userId, []);
      }
      userScores.get(incident.userId)!.push(incident.riskScore);
    }

    const highRiskUsers: [string, number][] = [];

    for (const [userId, scores] of userScores) {
      const avgScore = scores.reduce((a, b) => a + b) / scores.length;
      if (avgScore >= minScore) {
        highRiskUsers.push([userId, avgScore]);
      }
    }

    return highRiskUsers.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([userId]) => userId);
  }
}

// ==================== EXPORTS ====================

export const riskScorer = new RiskScorer();
export const fraudRuleEngine = new FraudRuleEngine();
export const fraudMonitor = new FraudMonitor();
