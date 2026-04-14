/**
 * Phase 167: Organization Policy Registry
 * Central policy registry, cataloging, lifecycle and search.
 */

import { logger } from '../logger';

export type RegistryPolicyState = 'draft' | 'review' | 'active' | 'deprecated' | 'retired';

export interface RegistryPolicy {
  policyId: string;
  name: string;
  domain: string;
  owner: string;
  version: number;
  state: RegistryPolicyState;
  tags: string[];
  description: string;
  createdAt: number;
  updatedAt: number;
}

class OrganizationPolicyRegistry {
  private policies = new Map<string, RegistryPolicy>();
  private counter = 0;

  registerPolicy(input: Omit<RegistryPolicy, 'policyId' | 'createdAt' | 'updatedAt'>): RegistryPolicy {
    const policyId = `org-policy-${Date.now()}-${++this.counter}`;
    const policy: RegistryPolicy = {
      ...input,
      policyId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.policies.set(policyId, policy);
    logger.debug('Organization policy registered', { policyId, domain: policy.domain, state: policy.state });
    return policy;
  }

  updatePolicy(policyId: string, patch: Partial<Omit<RegistryPolicy, 'policyId' | 'createdAt'>>): RegistryPolicy | undefined {
    const current = this.policies.get(policyId);
    if (!current) return undefined;

    const updated: RegistryPolicy = {
      ...current,
      ...patch,
      updatedAt: Date.now()
    };

    this.policies.set(policyId, updated);
    return updated;
  }

  getPolicy(policyId: string): RegistryPolicy | undefined {
    return this.policies.get(policyId);
  }

  listPolicies(): RegistryPolicy[] {
    return Array.from(this.policies.values());
  }
}

class PolicyCatalog {
  buildCatalogByDomain(policies: RegistryPolicy[]): Record<string, RegistryPolicy[]> {
    return policies.reduce<Record<string, RegistryPolicy[]>>((acc, policy) => {
      if (!acc[policy.domain]) acc[policy.domain] = [];
      acc[policy.domain].push(policy);
      return acc;
    }, {});
  }

  listOwners(policies: RegistryPolicy[]): string[] {
    return Array.from(new Set(policies.map(p => p.owner)));
  }

  listDeprecated(policies: RegistryPolicy[]): RegistryPolicy[] {
    return policies.filter(p => p.state === 'deprecated' || p.state === 'retired');
  }
}

class PolicyLifecycleManager {
  transition(policy: RegistryPolicy, nextState: RegistryPolicyState): RegistryPolicy {
    const validTransitions: Record<RegistryPolicyState, RegistryPolicyState[]> = {
      draft: ['review', 'retired'],
      review: ['active', 'draft', 'retired'],
      active: ['deprecated', 'retired'],
      deprecated: ['retired', 'active'],
      retired: []
    };

    if (!validTransitions[policy.state].includes(nextState)) {
      throw new Error(`Invalid transition: ${policy.state} -> ${nextState}`);
    }

    return {
      ...policy,
      state: nextState,
      updatedAt: Date.now()
    };
  }

  bumpVersion(policy: RegistryPolicy): RegistryPolicy {
    return {
      ...policy,
      version: policy.version + 1,
      updatedAt: Date.now()
    };
  }
}

class PolicySearchEngine {
  search(policies: RegistryPolicy[], query: string): RegistryPolicy[] {
    const q = query.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  filterByState(policies: RegistryPolicy[], state: RegistryPolicyState): RegistryPolicy[] {
    return policies.filter(p => p.state === state);
  }

  filterByOwner(policies: RegistryPolicy[], owner: string): RegistryPolicy[] {
    return policies.filter(p => p.owner === owner);
  }
}

export const organizationPolicyRegistry = new OrganizationPolicyRegistry();
export const policyCatalog = new PolicyCatalog();
export const policyLifecycleManager = new PolicyLifecycleManager();
export const policySearchEngine = new PolicySearchEngine();

export {
  OrganizationPolicyRegistry,
  PolicyCatalog,
  PolicyLifecycleManager,
  PolicySearchEngine
};


