/**
 * Phase 165: Policy Analytics & Insights
 * Policy usage analytics, access pattern analysis, conflict detection, recommendations
 */

import { logger } from './logger';

interface PolicyUsageMetric {
  policyId: string;
  evaluationCount: number;
  allowCount: number;
  denyCount: number;
  lastEvaluated: number;
  averageEvaluationTime: number;
}

interface AccessPattern {
  patternId: string;
  userId: string;
  resourceId: string;
  accessCount: number;
  lastAccess: number;
  firstAccess: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'rare';
}

interface PolicyConflict {
  conflictId: string;
  policy1Id: string;
  policy2Id: string;
  conflictType: 'contradictory' | 'overlapping' | 'precedence';
  severity: 'low' | 'medium' | 'high';
  affectedDecisions: number;
}

interface PolicyRecommendation {
  recommendationId: string;
  policyId: string;
  type: 'optimization' | 'consolidation' | 'removal' | 'refinement';
  description: string;
  expectedImpact: string;
  priority: 'low' | 'medium' | 'high';
}

class PolicyUsageAnalytics {
  private metrics: Map<string, PolicyUsageMetric> = new Map();

  recordEvaluation(policyId: string, evaluationTimeMs: number, result: 'allow' | 'deny'): void {
    if (!this.metrics.has(policyId)) {
      this.metrics.set(policyId, {
        policyId,
        evaluationCount: 0,
        allowCount: 0,
        denyCount: 0,
        lastEvaluated: Date.now(),
        averageEvaluationTime: 0
      });
    }

    const metric = this.metrics.get(policyId)!;
    const oldAvg = metric.averageEvaluationTime;
    metric.evaluationCount++;
    metric.lastEvaluated = Date.now();
    metric.averageEvaluationTime = (oldAvg * (metric.evaluationCount - 1) + evaluationTimeMs) / metric.evaluationCount;

    if (result === 'allow') {
      metric.allowCount++;
    } else {
      metric.denyCount++;
    }
  }

  getEffectiveness(policyId: string): { allowRate: number; denyRate: number; evaluationCount: number } {
    const metric = this.metrics.get(policyId);
    if (!metric) {
      return { allowRate: 0, denyRate: 0, evaluationCount: 0 };
    }

    const total = metric.allowCount + metric.denyCount;
    return {
      allowRate: total > 0 ? (metric.allowCount / total) * 100 : 0,
      denyRate: total > 0 ? (metric.denyCount / total) * 100 : 0,
      evaluationCount: metric.evaluationCount
    };
  }

  getPerformance(policyId: string): { averageTime: number; evaluationCount: number } {
    const metric = this.metrics.get(policyId);
    return {
      averageTime: metric?.averageEvaluationTime || 0,
      evaluationCount: metric?.evaluationCount || 0
    };
  }

  getSlowPolicies(thresholdMs: number): PolicyUsageMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.averageEvaluationTime > thresholdMs);
  }
}

class AccessPatternAnalyzer {
  private patterns: Map<string, AccessPattern> = new Map();
  private counter = 0;

  recordAccess(userId: string, resourceId: string): AccessPattern {
    const patternId = `pattern-${userId}-${resourceId}`;

    if (!this.patterns.has(patternId)) {
      this.patterns.set(patternId, {
        patternId,
        userId,
        resourceId,
        accessCount: 0,
        lastAccess: Date.now(),
        firstAccess: Date.now(),
        frequency: 'rare'
      });
    }

    const pattern = this.patterns.get(patternId)!;
    pattern.accessCount++;
    pattern.lastAccess = Date.now();
    pattern.frequency = this.calculateFrequency(pattern);

    return pattern;
  }

  private calculateFrequency(pattern: AccessPattern): 'hourly' | 'daily' | 'weekly' | 'monthly' | 'rare' {
    const daysSinceFirst = (Date.now() - pattern.firstAccess) / (24 * 60 * 60 * 1000);
    const accessPerDay = pattern.accessCount / Math.max(daysSinceFirst, 1);

    if (accessPerDay > 24) return 'hourly';
    if (accessPerDay > 1) return 'daily';
    if (accessPerDay > 0.15) return 'weekly';
    if (accessPerDay > 0.03) return 'monthly';
    return 'rare';
  }

  getPattern(userId: string, resourceId: string): AccessPattern | undefined {
    return this.patterns.get(`pattern-${userId}-${resourceId}`);
  }

  getAnomalousAccess(): AccessPattern[] {
    return Array.from(this.patterns.values()).filter(p => {
      const expectedFrequency = p.accessCount > 100 ? 'daily' : p.accessCount > 20 ? 'weekly' : 'rare';
      return p.frequency !== expectedFrequency;
    });
  }

  getUserPatterns(userId: string): AccessPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.userId === userId);
  }
}

class PolicyConflictDetector {
  private conflicts: Map<string, PolicyConflict> = new Map();
  private counter = 0;

  detectConflicts(policy1Id: string, policy2Id: string, rules1: any[], rules2: any[]): PolicyConflict | null {
    // Simulate conflict detection
    const isConflicting = rules1.some(r1 => rules2.some(r2 => JSON.stringify(r1.condition) === JSON.stringify(r2.condition) && r1.effect !== r2.effect));

    if (!isConflicting) {
      return null;
    }

    const conflictId = `conflict-${Date.now()}-${++this.counter}`;
    const conflict: PolicyConflict = {
      conflictId,
      policy1Id,
      policy2Id,
      conflictType: 'contradictory',
      severity: 'high',
      affectedDecisions: Math.floor(Math.random() * 100) + 10
    };

    this.conflicts.set(conflictId, conflict);

    logger.debug('Policy conflict detected', {
      conflictId,
      policy1Id,
      policy2Id,
      affectedDecisions: conflict.affectedDecisions
    });

    return conflict;
  }

  getConflict(conflictId: string): PolicyConflict | undefined {
    return this.conflicts.get(conflictId);
  }

  getPolicyConflicts(policyId: string): PolicyConflict[] {
    return Array.from(this.conflicts.values()).filter(c => c.policy1Id === policyId || c.policy2Id === policyId);
  }

  getAllConflicts(): PolicyConflict[] {
    return Array.from(this.conflicts.values());
  }

  getHighSeverityConflicts(): PolicyConflict[] {
    return Array.from(this.conflicts.values()).filter(c => c.severity === 'high');
  }
}

class PolicyRecommendationEngine {
  private recommendations: Map<string, PolicyRecommendation> = new Map();
  private counter = 0;

  generateRecommendations(policyId: string, usage: any, conflicts: any[]): PolicyRecommendation[] {
    const recommendations: PolicyRecommendation[] = [];

    // Optimization recommendation
    if (usage.averageTime > 100) {
      const recommendation: PolicyRecommendation = {
        recommendationId: `rec-${Date.now()}-${++this.counter}`,
        policyId,
        type: 'optimization',
        description: 'Policy evaluation is slower than baseline',
        expectedImpact: 'Reduce evaluation time by 30-50%',
        priority: 'high'
      };
      recommendations.push(recommendation);
      this.recommendations.set(recommendation.recommendationId, recommendation);
    }

    // Consolidation recommendation
    if (conflicts.length > 2) {
      const recommendation: PolicyRecommendation = {
        recommendationId: `rec-${Date.now()}-${++this.counter}`,
        policyId,
        type: 'consolidation',
        description: 'Policy has multiple conflicts with other policies',
        expectedImpact: 'Reduce policy complexity and conflicts',
        priority: 'medium'
      };
      recommendations.push(recommendation);
      this.recommendations.set(recommendation.recommendationId, recommendation);
    }

    logger.debug('Recommendations generated', { policyId, count: recommendations.length });

    return recommendations;
  }

  getRecommendation(recommendationId: string): PolicyRecommendation | undefined {
    return this.recommendations.get(recommendationId);
  }

  getPolicyRecommendations(policyId: string): PolicyRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.policyId === policyId);
  }

  getHighPriorityRecommendations(): PolicyRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.priority === 'high');
  }
}

export const policyUsageAnalytics = new PolicyUsageAnalytics();
export const accessPatternAnalyzer = new AccessPatternAnalyzer();
export const policyConflictDetector = new PolicyConflictDetector();
export const policyRecommendationEngine = new PolicyRecommendationEngine();

export { PolicyUsageMetric, AccessPattern, PolicyConflict, PolicyRecommendation };
