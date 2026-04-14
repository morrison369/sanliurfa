/**
 * Phase 173: Policy Conflict Resolution
 */

import { logger } from '../logger';

export interface PolicyRule {
  ruleId: string;
  policyId: string;
  condition: Record<string, unknown>;
  effect: 'allow' | 'deny';
  priority: number;
}

class ConflictDetectorEngine {
  detect(rules: PolicyRule[]): Array<{ left: string; right: string; reason: string }> {
    const conflicts: Array<{ left: string; right: string; reason: string }> = [];
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i];
        const b = rules[j];
        if (JSON.stringify(a.condition) === JSON.stringify(b.condition) && a.effect !== b.effect) {
          conflicts.push({ left: a.ruleId, right: b.ruleId, reason: 'opposite effect same condition' });
        }
      }
    }
    return conflicts;
  }
}

class ConflictResolutionEngine {
  resolve(rules: PolicyRule[]): PolicyRule[] {
    const ordered = [...rules].sort((a, b) => b.priority - a.priority);
    logger.debug('Conflict resolution applied', { ruleCount: rules.length, resolvedCount: ordered.length });
    return ordered;
  }
}

class RulePrecedenceManager {
  highest(rules: PolicyRule[]): PolicyRule | undefined {
    return [...rules].sort((a, b) => b.priority - a.priority)[0];
  }

  rebalance(rules: PolicyRule[]): PolicyRule[] {
    return [...rules]
      .sort((a, b) => b.priority - a.priority)
      .map((rule, idx) => ({ ...rule, priority: rules.length - idx }));
  }
}

class ConflictAuditTrail {
  private entries: Array<{ conflictId: string; timestamp: number; summary: string }> = [];
  private counter = 0;

  record(summary: string): string {
    const conflictId = `conflict-${Date.now()}-${++this.counter}`;
    this.entries.push({ conflictId, timestamp: Date.now(), summary });
    return conflictId;
  }

  list() {
    return this.entries;
  }
}

export const conflictDetectorEngine = new ConflictDetectorEngine();
export const conflictResolutionEngine = new ConflictResolutionEngine();
export const rulePrecedenceManager = new RulePrecedenceManager();
export const conflictAuditTrail = new ConflictAuditTrail();

export {
  ConflictDetectorEngine,
  ConflictResolutionEngine,
  RulePrecedenceManager,
  ConflictAuditTrail
};


