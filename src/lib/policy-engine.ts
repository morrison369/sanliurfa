/**
 * Phase 33: Policy Engine & Access Control
 * Attribute-based access control (ABAC), policy evaluation, access audit logging
 */

import { logger } from './logging';

export interface PolicySubject {
  userId: string;
  role: string;
  attributes: Record<string, any>;
}

export interface PolicyResource {
  type: string;
  id: string;
  attributes: Record<string, any>;
}

export interface PolicyRule {
  id: string;
  effect: 'allow' | 'deny';
  subject?: Partial<PolicySubject>;
  resource?: Partial<PolicyResource>;
  action: string;
  conditions?: ((subject: PolicySubject, resource: PolicyResource) => boolean)[];
  enabled: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  rule?: string;
  reason: string;
}

export class PolicyRepository {
  private rules = new Map<string, PolicyRule>();

  addRule(rule: PolicyRule): void {
    this.rules.set(rule.id, { ...rule, enabled: true });
    logger.debug('Policy rule added', { id: rule.id, action: rule.action });
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getRules(action?: string): PolicyRule[] {
    const all = Array.from(this.rules.values()).filter(r => r.enabled);
    if (action) {
      return all.filter(r => r.action === action);
    }
    return all;
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }
}

export class PolicyEvaluator {
  constructor(private repository: PolicyRepository) {}

  evaluate(subject: PolicySubject, resource: PolicyResource, action: string): PolicyDecision {
    const rules = this.repository.getRules(action);

    let allowedByRule: PolicyRule | undefined;
    let deniedByRule: PolicyRule | undefined;

    for (const rule of rules) {
      if (this.matches(rule, subject, resource)) {
        if (rule.effect === 'deny') {
          deniedByRule = rule;
          break;
        } else if (!allowedByRule) {
          allowedByRule = rule;
        }
      }
    }

    if (deniedByRule) {
      return {
        allowed: false,
        rule: deniedByRule.id,
        reason: `Access denied by policy ${deniedByRule.id}`
      };
    }

    if (allowedByRule) {
      return {
        allowed: true,
        rule: allowedByRule.id,
        reason: `Access allowed by policy ${allowedByRule.id}`
      };
    }

    return {
      allowed: false,
      reason: 'No matching policy found'
    };
  }

  evaluateAll(subject: PolicySubject, resources: PolicyResource[], action: string): Map<string, PolicyDecision> {
    const results = new Map<string, PolicyDecision>();
    for (const resource of resources) {
      const decision = this.evaluate(subject, resource, action);
      results.set(resource.id, decision);
    }
    return results;
  }

  private matches(rule: PolicyRule, subject: PolicySubject, resource: PolicyResource): boolean {
    if (rule.subject) {
      if (rule.subject.role && rule.subject.role !== subject.role) return false;
      if (rule.subject.userId && rule.subject.userId !== subject.userId) return false;
    }

    if (rule.resource) {
      if (rule.resource.type && rule.resource.type !== resource.type) return false;
    }

    if (rule.conditions && rule.conditions.length > 0) {
      for (const condition of rule.conditions) {
        try {
          if (!condition(subject, resource)) return false;
        } catch (err) {
          return false;
        }
      }
    }

    return true;
  }
}

export class AccessAuditLog {
  private logs: any[] = [];
  private readonly maxHistory = 100000;

  record(subject: PolicySubject, resource: PolicyResource, action: string, decision: PolicyDecision): void {
    this.logs.push({
      subject,
      resource,
      action,
      decision,
      timestamp: Date.now()
    });

    if (this.logs.length > this.maxHistory) {
      this.logs.shift();
    }

    if (!decision.allowed) {
      logger.warn('Access denied', { userId: subject.userId, resource: resource.id, action });
    }
  }

  getLog(userId?: string, limit: number = 100): any[] {
    let filtered = this.logs;
    if (userId) {
      filtered = filtered.filter(l => l.subject.userId === userId);
    }
    return filtered.slice(-limit);
  }

  getDenials(limit: number = 50): any[] {
    return this.logs.filter(l => !l.decision.allowed).slice(-limit);
  }
}

export const policyRepository = new PolicyRepository();
export const policyEvaluator = new PolicyEvaluator(policyRepository);
export const accessAuditLog = new AccessAuditLog();
