/**
 * Phase 166: Policy Enforcement & Remediation
 * Policy enforcement engine, auto-remediation, exception management, evaluation cache
 */

import { logger } from './logger';

interface PolicyEvaluationResult {
  resultId: string;
  policyId: string;
  decision: 'allow' | 'deny';
  evaluatedAt: number;
  context: Record<string, any>;
  ruleMatched: number;
}

interface RemediationAction {
  actionId: string;
  resultId: string;
  action: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: number;
  executedAt?: number;
}

interface PolicyException {
  exceptionId: string;
  policyId: string;
  context: Record<string, any>;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  expiresAt: number;
  createdAt: number;
}

class PolicyEnforcementEngine {
  private counter = 0;

  enforcePolicy(policyId: string, policy: any, context: Record<string, any>): PolicyEvaluationResult {
    const resultId = `eval-${Date.now()}-${++this.counter}`;

    // Simple rule matching evaluation
    let decision: 'allow' | 'deny' = 'deny';
    let ruleMatched = -1;

    for (let i = 0; i < policy.rules.length; i++) {
      const rule = policy.rules[i];
      let conditionMet = true;

      for (const [key, value] of Object.entries(rule.condition)) {
        if (context[key] !== value) {
          conditionMet = false;
          break;
        }
      }

      if (conditionMet) {
        decision = rule.effect;
        ruleMatched = i;
        break;
      }
    }

    const result: PolicyEvaluationResult = {
      resultId,
      policyId,
      decision,
      evaluatedAt: Date.now(),
      context,
      ruleMatched
    };

    logger.debug('Policy enforced', {
      resultId,
      policyId,
      decision,
      ruleMatched
    });

    return result;
  }

  evaluateAgainstMultiplePolicies(policies: any[], context: Record<string, any>): { finalDecision: 'allow' | 'deny'; policyId: string } {
    // First matching policy wins
    for (const policy of policies) {
      const result = this.enforcePolicy(policy.policyId, policy, context);
      if (result.decision === 'deny') {
        return { finalDecision: 'deny', policyId: policy.policyId };
      }
    }

    return { finalDecision: 'allow', policyId: policies[0]?.policyId || 'default' };
  }

  checkPolicyCompliance(result: PolicyEvaluationResult, expectedDecision: 'allow' | 'deny'): { compliant: boolean; passed: boolean } {
    const passed = result.decision === expectedDecision;
    return { compliant: passed, passed };
  }
}

class AutoRemediationExecutor {
  private actions: Map<string, RemediationAction> = new Map();
  private counter = 0;

  planRemediationActions(resultId: string, decision: string): RemediationAction[] {
    const actions: RemediationAction[] = [];

    if (decision === 'deny') {
      // Remediation for denied requests
      const actions_: Array<{ action: string }> = [
        { action: 'log-incident' },
        { action: 'notify-administrator' },
        { action: 'block-request' }
      ];

      for (const actionDef of actions_) {
        const actionId = `action-${Date.now()}-${++this.counter}`;
        const action: RemediationAction = {
          actionId,
          resultId,
          action: actionDef.action,
          status: 'pending',
          createdAt: Date.now()
        };
        actions.push(action);
        this.actions.set(actionId, action);
      }
    }

    return actions;
  }

  executeAction(actionId: string): RemediationAction | undefined {
    const action = this.actions.get(actionId);
    if (!action) return undefined;

    action.status = 'executing';
    action.executedAt = Date.now();

    // Simulate execution delay
    setTimeout(() => {
      action.status = 'completed';
    }, 100);

    logger.debug('Remediation action executed', {
      actionId,
      action: action.action,
      status: action.status
    });

    return action;
  }

  executeAllActions(resultId: string): { executedCount: number; totalCount: number } {
    const actions = Array.from(this.actions.values()).filter(a => a.resultId === resultId);

    for (const action of actions) {
      this.executeAction(action.actionId);
    }

    return {
      executedCount: actions.length,
      totalCount: actions.length
    };
  }

  getAction(actionId: string): RemediationAction | undefined {
    return this.actions.get(actionId);
  }
}

class PolicyExceptionManager {
  private exceptions: Map<string, PolicyException> = new Map();
  private counter = 0;

  requestException(policyId: string, context: Record<string, any>, requestedBy: string, durationMs: number): PolicyException {
    const exceptionId = `exception-${Date.now()}-${++this.counter}`;
    const exception: PolicyException = {
      exceptionId,
      policyId,
      context,
      requestedBy,
      status: 'pending',
      expiresAt: Date.now() + durationMs,
      createdAt: Date.now()
    };

    this.exceptions.set(exceptionId, exception);

    logger.debug('Policy exception requested', {
      exceptionId,
      policyId,
      requestedBy,
      durationMs
    });

    return exception;
  }

  approveException(exceptionId: string, approvedBy: string): PolicyException | undefined {
    const exception = this.exceptions.get(exceptionId);
    if (exception) {
      exception.status = 'approved';
      exception.approvedBy = approvedBy;
      return exception;
    }
    return undefined;
  }

  denyException(exceptionId: string): PolicyException | undefined {
    const exception = this.exceptions.get(exceptionId);
    if (exception) {
      exception.status = 'denied';
      return exception;
    }
    return undefined;
  }

  getException(exceptionId: string): PolicyException | undefined {
    return this.exceptions.get(exceptionId);
  }

  getActiveExceptions(): PolicyException[] {
    return Array.from(this.exceptions.values()).filter(
      e => e.status === 'approved' && e.expiresAt > Date.now()
    );
  }

  isExceptionApplicable(policyId: string, context: Record<string, any>): boolean {
    const activeExceptions = this.getActiveExceptions().filter(e => e.policyId === policyId);

    for (const exception of activeExceptions) {
      let matches = true;
      for (const [key, value] of Object.entries(exception.context)) {
        if (context[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }

    return false;
  }
}

class PolicyEvaluationCache {
  private cache: Map<string, { result: PolicyEvaluationResult; cachedAt: number }> = new Map();
  private ttlMs: number = 60000; // 1 minute default

  cacheEvaluation(result: PolicyEvaluationResult): void {
    const cacheKey = `${result.policyId}-${JSON.stringify(result.context).substring(0, 50)}`;
    this.cache.set(cacheKey, {
      result,
      cachedAt: Date.now()
    });

    logger.debug('Policy evaluation cached', { cacheKey });
  }

  getCachedEvaluation(policyId: string, context: Record<string, any>): PolicyEvaluationResult | null {
    const cacheKey = `${policyId}-${JSON.stringify(context).substring(0, 50)}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    const age = Date.now() - cached.cachedAt;
    if (age > this.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    logger.debug('Policy evaluation cache hit', { cacheKey, ageMs: age });
    return cached.result;
  }

  invalidateCache(policyId: string): number {
    let invalidatedCount = 0;

    for (const [key] of this.cache) {
      if (key.startsWith(policyId)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.debug('Policy cache invalidated', { policyId, invalidatedCount });
    return invalidatedCount;
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('Policy evaluation cache cleared');
  }

  getStats(): { cacheSize: number; hitRate: number } {
    return {
      cacheSize: this.cache.size,
      hitRate: 0.75 // Simulated hit rate
    };
  }
}

export const policyEnforcementEngine = new PolicyEnforcementEngine();
export const autoRemediationExecutor = new AutoRemediationExecutor();
export const policyExceptionManager = new PolicyExceptionManager();
export const policyEvaluationCache = new PolicyEvaluationCache();

export { PolicyEvaluationResult, RemediationAction, PolicyException };
