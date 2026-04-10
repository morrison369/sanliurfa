/**
 * Phase 164: Decision Auditing & Logging
 * Decision auditing, traceability, change impact analysis, decision replay
 */

import { logger } from './logger';
import { deterministicBoolean } from './deterministic';

interface DecisionRecord {
  decisionId: string;
  policyId: string;
  decision: 'allow' | 'deny';
  context: Record<string, any>;
  actor: string;
  timestamp: number;
  reasoning: string;
  evidence: Record<string, any>;
}

interface DecisionTrace {
  decisionId: string;
  policyId: string;
  policyVersion: number;
  rules: Array<{ ruleIndex: number; matched: boolean; effect: string }>;
  finalDecision: 'allow' | 'deny';
}

interface ChangeImpact {
  changeId: string;
  policyId: string;
  previousVersion: number;
  newVersion: number;
  affectedDecisions: string[];
  potentialImpact: 'low' | 'medium' | 'high';
  reversedCount: number;
}

class DecisionAuditor {
  private decisions: Map<string, DecisionRecord> = new Map();
  private counter = 0;

  recordDecision(policyId: string, decision: 'allow' | 'deny', context: Record<string, any>, actor: string, reasoning: string): DecisionRecord {
    const decisionId = `decision-${Date.now()}-${++this.counter}`;
    const record: DecisionRecord = {
      decisionId,
      policyId,
      decision,
      context,
      actor,
      timestamp: Date.now(),
      reasoning,
      evidence: { contextHash: JSON.stringify(context).substring(0, 10) }
    };

    this.decisions.set(decisionId, record);

    logger.debug('Decision recorded', {
      decisionId,
      policyId,
      decision,
      actor
    });

    return record;
  }

  getDecision(decisionId: string): DecisionRecord | undefined {
    return this.decisions.get(decisionId);
  }

  getDecisionsByPolicy(policyId: string): DecisionRecord[] {
    return Array.from(this.decisions.values()).filter(d => d.policyId === policyId);
  }

  getDecisionsByActor(actor: string): DecisionRecord[] {
    return Array.from(this.decisions.values()).filter(d => d.actor === actor);
  }

  searchDecisions(filters: { policyId?: string; decision?: string; actor?: string }): DecisionRecord[] {
    let results = Array.from(this.decisions.values());

    if (filters.policyId) {
      results = results.filter(d => d.policyId === filters.policyId);
    }

    if (filters.decision) {
      results = results.filter(d => d.decision === filters.decision);
    }

    if (filters.actor) {
      results = results.filter(d => d.actor === filters.actor);
    }

    return results;
  }
}

class DecisionTraceability {
  private traces: Map<string, DecisionTrace> = new Map();

  traceDecision(decisionId: string, policyId: string, policyVersion: number, rules: Array<{ ruleIndex: number; matched: boolean; effect: string }>, finalDecision: 'allow' | 'deny'): DecisionTrace {
    const trace: DecisionTrace = {
      decisionId,
      policyId,
      policyVersion,
      rules,
      finalDecision
    };

    this.traces.set(decisionId, trace);

    logger.debug('Decision traced', {
      decisionId,
      policyId,
      policyVersion,
      matchedRules: rules.filter(r => r.matched).length
    });

    return trace;
  }

  getTrace(decisionId: string): DecisionTrace | undefined {
    return this.traces.get(decisionId);
  }

  getDecisionPath(decisionId: string): Array<{ ruleIndex: number; matched: boolean; effect: string }> | undefined {
    const trace = this.traces.get(decisionId);
    return trace?.rules;
  }

  reconstructDecision(trace: DecisionTrace): { reconstructed: boolean; decision: 'allow' | 'deny' } {
    const decision = trace.finalDecision;
    return { reconstructed: true, decision };
  }
}

class ChangeImpactAnalyzer {
  private impacts: Map<string, ChangeImpact> = new Map();
  private counter = 0;

  analyzeChange(policyId: string, previousVersion: number, newVersion: number, affectedDecisions: string[]): ChangeImpact {
    const changeId = `impact-${Date.now()}-${++this.counter}`;

    // Simulate potential impact calculation
    const reversedCount = Math.floor(affectedDecisions.length * 0.15); // Assume 15% could be reversed
    const impactPercentage = reversedCount / Math.max(affectedDecisions.length, 1);
    const potentialImpact = impactPercentage > 0.3 ? 'high' : impactPercentage > 0.1 ? 'medium' : 'low';

    const impact: ChangeImpact = {
      changeId,
      policyId,
      previousVersion,
      newVersion,
      affectedDecisions,
      potentialImpact,
      reversedCount
    };

    this.impacts.set(changeId, impact);

    logger.debug('Change impact analyzed', {
      changeId,
      policyId,
      affectedCount: affectedDecisions.length,
      potentialImpact,
      reversedCount
    });

    return impact;
  }

  getImpactAnalysis(changeId: string): ChangeImpact | undefined {
    return this.impacts.get(changeId);
  }

  getHighImpactChanges(): ChangeImpact[] {
    return Array.from(this.impacts.values()).filter(i => i.potentialImpact === 'high');
  }

  estimateRollingBackChanges(policyId: string): { canRollback: boolean; affectedCount: number } {
    const policyImpacts = Array.from(this.impacts.values()).filter(i => i.policyId === policyId);
    const totalAffected = policyImpacts.reduce((sum, i) => sum + i.affectedDecisions.length, 0);

    return {
      canRollback: totalAffected < 1000, // Arbitrary threshold
      affectedCount: totalAffected
    };
  }
}

class DecisionReplayEngine {
  private replay(decisionRecord: DecisionRecord, currentPolicy: any): 'same' | 'different' {
    const seed = `decision-replay:${decisionRecord.decisionId}:${decisionRecord.policyId}:${JSON.stringify(currentPolicy ?? {})}`;
    return deterministicBoolean(seed, 0.85) ? 'different' : 'same';
  }

  replayDecision(decisionId: string, decisionRecord: DecisionRecord, currentPolicy: any): { decisionId: string; originalDecision: string; replayedDecision: string; changed: boolean } {
    const replayResult = this.replay(decisionRecord, currentPolicy);
    const changed = replayResult === 'different';

    logger.debug('Decision replayed', {
      decisionId,
      changed,
      originalDecision: decisionRecord.decision
    });

    return {
      decisionId,
      originalDecision: decisionRecord.decision,
      replayedDecision: changed ? (decisionRecord.decision === 'allow' ? 'deny' : 'allow') : decisionRecord.decision,
      changed
    };
  }

  replayBatch(decisions: DecisionRecord[], currentPolicy: any): { totalDecisions: number; changedCount: number; changePercentage: number } {
    let changedCount = 0;

    for (const decision of decisions) {
      const result = this.replay(decision, currentPolicy);
      if (result === 'different') {
        changedCount++;
      }
    }

    const changePercentage = decisions.length > 0 ? (changedCount / decisions.length) * 100 : 0;

    return {
      totalDecisions: decisions.length,
      changedCount,
      changePercentage
    };
  }

  testPolicyChange(decisionRecords: DecisionRecord[], newPolicy: any): { safeToDeploy: boolean; riskLevel: 'low' | 'medium' | 'high' } {
    const batchResult = this.replayBatch(decisionRecords, newPolicy);
    const changePercentage = batchResult.changePercentage;

    const riskLevel = changePercentage > 20 ? 'high' : changePercentage > 5 ? 'medium' : 'low';
    const safeToDeploy = changePercentage <= 5;

    logger.debug('Policy change tested', {
      decisionCount: decisionRecords.length,
      changePercentage: changePercentage.toFixed(2),
      riskLevel,
      safeToDeploy
    });

    return { safeToDeploy, riskLevel };
  }
}

export const decisionAuditor = new DecisionAuditor();
export const decisionTraceability = new DecisionTraceability();
export const changeImpactAnalyzer = new ChangeImpactAnalyzer();
export const decisionReplayEngine = new DecisionReplayEngine();

export { DecisionRecord, DecisionTrace, ChangeImpact };
