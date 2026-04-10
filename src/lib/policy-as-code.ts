/**
 * Phase 161: Policy as Code & Definition
 * Policy definition, version control, templates, compilation
 */

import { hashString } from './deterministic';
import { logger } from './logger';

interface PolicyDefinition {
  policyId: string;
  name: string;
  description: string;
  version: number;
  rules: Array<{ condition: Record<string, any>; action: string; effect: 'allow' | 'deny' }>;
  variables: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface PolicyTemplate {
  templateId: string;
  name: string;
  category: 'access-control' | 'data-protection' | 'compliance' | 'security';
  description: string;
  rules: Array<{ condition: Record<string, any>; action: string; effect: 'allow' | 'deny' }>;
  variables: Record<string, any>;
}

interface CompiledPolicy {
  policyId: string;
  rules: Array<{ condition: Record<string, any>; action: string; effect: 'allow' | 'deny' }>;
  hash: string;
  compiledAt: number;
  errors: string[];
}

class PolicyDefinitionBuilder {
  private policies: Map<string, PolicyDefinition> = new Map();
  private counter = 0;

  buildPolicy(name: string, description: string): { policyId: string; addRule: (condition: Record<string, any>, action: string, effect: 'allow' | 'deny') => any; build: () => PolicyDefinition } {
    const policyId = `policy-${Date.now()}-${++this.counter}`;
    const policy: PolicyDefinition = {
      policyId,
      name,
      description,
      version: 1,
      rules: [],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const builder = {
      addRule: (condition: Record<string, any>, action: string, effect: 'allow' | 'deny') => {
        policy.rules.push({ condition, action, effect });
        return builder;
      },
      build: () => {
        this.policies.set(policyId, policy);
        logger.debug('Policy built', { policyId, name, ruleCount: policy.rules.length });
        return policy;
      }
    };

    return { policyId, ...builder };
  }

  setVariables(policyId: string, variables: Record<string, any>): PolicyDefinition | undefined {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.variables = variables;
      policy.updatedAt = Date.now();
      return policy;
    }
    return undefined;
  }

  getPolicy(policyId: string): PolicyDefinition | undefined {
    return this.policies.get(policyId);
  }

  listPolicies(): PolicyDefinition[] {
    return Array.from(this.policies.values());
  }
}

class PolicyVersionManager {
  private versions: Map<string, PolicyDefinition[]> = new Map();

  createVersion(policy: PolicyDefinition): PolicyDefinition {
    const versionedPolicy: PolicyDefinition = {
      ...policy,
      version: (policy.version || 0) + 1,
      updatedAt: Date.now()
    };

    const policyVersions = this.versions.get(policy.policyId) || [];
    policyVersions.push(versionedPolicy);
    this.versions.set(policy.policyId, policyVersions);

    logger.debug('Policy version created', { policyId: policy.policyId, version: versionedPolicy.version });

    return versionedPolicy;
  }

  getVersion(policyId: string, version: number): PolicyDefinition | undefined {
    return this.versions.get(policyId)?.find(p => p.version === version);
  }

  getVersionHistory(policyId: string): PolicyDefinition[] {
    return this.versions.get(policyId) || [];
  }

  compareVersions(policyId: string, version1: number, version2: number): { added: any[]; removed: any[]; modified: any[] } {
    const v1 = this.getVersion(policyId, version1);
    const v2 = this.getVersion(policyId, version2);

    if (!v1 || !v2) {
      return { added: [], removed: [], modified: [] };
    }

    return {
      added: v2.rules.filter((r, idx) => !v1.rules.some((r1, i) => i === idx)),
      removed: v1.rules.filter((r, idx) => !v2.rules.some((r2, i) => i === idx)),
      modified: v2.rules.filter((r, idx) => v1.rules[idx] && JSON.stringify(v1.rules[idx]) !== JSON.stringify(r))
    };
  }
}

class PolicyTemplateLibrary {
  private templates: Map<string, PolicyTemplate> = new Map();
  private counter = 0;

  registerTemplate(name: string, category: 'access-control' | 'data-protection' | 'compliance' | 'security', description: string, rules: Array<{ condition: Record<string, any>; action: string; effect: 'allow' | 'deny' }>): PolicyTemplate {
    const templateId = `template-${++this.counter}`;
    const template: PolicyTemplate = {
      templateId,
      name,
      category,
      description,
      rules,
      variables: {}
    };

    this.templates.set(templateId, template);

    logger.debug('Policy template registered', { templateId, name, category });

    return template;
  }

  getTemplate(templateId: string): PolicyTemplate | undefined {
    return this.templates.get(templateId);
  }

  getTemplatesByCategory(category: string): PolicyTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  applyTemplate(templateId: string, customName: string): PolicyDefinition | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    return {
      policyId: `policy-from-template-${Date.now()}`,
      name: customName || template.name,
      description: template.description,
      version: 1,
      rules: JSON.parse(JSON.stringify(template.rules)),
      variables: JSON.parse(JSON.stringify(template.variables)),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
}

class PolicyCompiler {
  private counter = 0;

  compilePolicy(policy: PolicyDefinition): CompiledPolicy {
    const errors: string[] = [];

    // Validate rules
    for (let i = 0; i < policy.rules.length; i++) {
      const rule = policy.rules[i];
      if (!rule.condition || !rule.action) {
        errors.push(`Rule ${i}: Missing condition or action`);
      }
      if (!['allow', 'deny'].includes(rule.effect)) {
        errors.push(`Rule ${i}: Invalid effect ${rule.effect}`);
      }
    }

    const hash = this.hashPolicy(policy);

    const compiled: CompiledPolicy = {
      policyId: policy.policyId,
      rules: policy.rules,
      hash,
      compiledAt: Date.now(),
      errors
    };

    logger.debug('Policy compiled', {
      policyId: policy.policyId,
      errors: errors.length,
      success: errors.length === 0
    });

    return compiled;
  }

  private hashPolicy(policy: PolicyDefinition): string {
    const normalizedPolicy = JSON.stringify({
      policyId: policy.policyId,
      name: policy.name,
      description: policy.description,
      version: policy.version,
      rules: policy.rules,
      variables: policy.variables
    });
    return `hash-${hashString(normalizedPolicy).toString(36)}`;
  }

  validatePolicy(policy: PolicyDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.name || policy.name.trim().length === 0) {
      errors.push('Policy name is required');
    }

    if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
      errors.push('Policy must have at least one rule');
    }

    for (const rule of policy.rules) {
      if (!rule.condition) errors.push('Rule missing condition');
      if (!rule.action) errors.push('Rule missing action');
    }

    return { valid: errors.length === 0, errors };
  }

  evaluatePolicy(policy: PolicyDefinition, context: Record<string, any>): { effect: 'allow' | 'deny'; action: string } {
    for (const rule of policy.rules) {
      if (this.evaluateCondition(rule.condition, context)) {
        return { effect: rule.effect, action: rule.action };
      }
    }
    return { effect: 'deny', action: 'default-deny' };
  }

  private evaluateCondition(condition: Record<string, any>, context: Record<string, any>): boolean {
    // Simple condition matching: check if context properties match condition values
    for (const [key, value] of Object.entries(condition)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

export const policyDefinitionBuilder = new PolicyDefinitionBuilder();
export const policyVersionManager = new PolicyVersionManager();
export const policyTemplateLibrary = new PolicyTemplateLibrary();
export const policyCompiler = new PolicyCompiler();

export { PolicyDefinition, PolicyTemplate, CompiledPolicy };
