/**
 * Phase 179: Data Domain Ownership
 * Domain registry, governance, metrics collection, lineage tracking
 */

import { logger } from './logger';

interface DataDomain {
  domainId: string;
  name: string;
  description: string;
  owner: string;
  team: string[];
  dataProducts: string[];
  tags: string[];
  createdAt: number;
  status: 'active' | 'deprecated' | 'archived';
}

interface DomainPolicy {
  policyId: string;
  domainId: string;
  type: 'access' | 'retention' | 'classification' | 'sharing';
  rule: Record<string, any>;
  enforcedAt: number;
}

interface DomainHealthMetric {
  domainId: string;
  freshness: number;
  completeness: number;
  accuracy: number;
  availability: number;
  overallHealth: number;
  measuredAt: number;
}

class DataDomainRegistry {
  private domains: Map<string, DataDomain> = new Map();
  private counter = 0;

  register(name: string, description: string, owner: string, team: string[], tags: string[] = []): DataDomain {
    const domainId = `domain-${Date.now()}-${++this.counter}`;
    const domain: DataDomain = {
      domainId, name, description, owner, team,
      dataProducts: [], tags, createdAt: Date.now(), status: 'active'
    };
    this.domains.set(domainId, domain);
    logger.debug('Data domain registered', { domainId, name, owner });
    return domain;
  }

  addDataProduct(domainId: string, productId: string): boolean {
    const domain = this.domains.get(domainId);
    if (domain && !domain.dataProducts.includes(productId)) {
      domain.dataProducts.push(productId);
      return true;
    }
    return false;
  }

  transferOwnership(domainId: string, newOwner: string): DataDomain | undefined {
    const domain = this.domains.get(domainId);
    if (domain) {
      domain.owner = newOwner;
      logger.debug('Domain ownership transferred', { domainId, newOwner });
      return domain;
    }
    return undefined;
  }

  getDomain(domainId: string): DataDomain | undefined {
    return this.domains.get(domainId);
  }

  findByOwner(owner: string): DataDomain[] {
    return Array.from(this.domains.values()).filter(d => d.owner === owner);
  }

  listActive(): DataDomain[] {
    return Array.from(this.domains.values()).filter(d => d.status === 'active');
  }
}

class DataDomainGovernor {
  private policies: Map<string, DomainPolicy[]> = new Map();
  private counter = 0;

  definePolicy(domainId: string, type: DomainPolicy['type'], rule: Record<string, any>): DomainPolicy {
    const policyId = `policy-${Date.now()}-${++this.counter}`;
    const policy: DomainPolicy = { policyId, domainId, type, rule, enforcedAt: Date.now() };
    const existing = this.policies.get(domainId) || [];
    existing.push(policy);
    this.policies.set(domainId, existing);
    logger.debug('Domain policy defined', { policyId, domainId, type });
    return policy;
  }

  evaluate(domainId: string, requestContext: Record<string, any>): { allowed: boolean; violations: string[] } {
    const policies = this.policies.get(domainId) || [];
    const violations: string[] = [];

    for (const policy of policies.filter(p => p.type === 'access')) {
      for (const [key, value] of Object.entries(policy.rule)) {
        if (requestContext[key] !== value) {
          violations.push(`Policy ${policy.policyId}: ${key} mismatch`);
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  getPolicies(domainId: string): DomainPolicy[] {
    return this.policies.get(domainId) || [];
  }

  getPoliciesByType(type: string): DomainPolicy[] {
    return Array.from(this.policies.values()).flat().filter(p => p.type === type);
  }
}

class DataDomainMetricsCollector {
  private metrics: Map<string, DomainHealthMetric[]> = new Map();

  record(domainId: string, freshness: number, completeness: number, accuracy: number, availability: number): DomainHealthMetric {
    const overallHealth = freshness * 0.25 + completeness * 0.3 + accuracy * 0.3 + availability * 0.15;
    const metric: DomainHealthMetric = {
      domainId, freshness, completeness, accuracy, availability,
      overallHealth, measuredAt: Date.now()
    };
    const existing = this.metrics.get(domainId) || [];
    existing.push(metric);
    this.metrics.set(domainId, existing);
    return metric;
  }

  getLatest(domainId: string): DomainHealthMetric | undefined {
    const history = this.metrics.get(domainId) || [];
    return history[history.length - 1];
  }

  getUnhealthyDomains(threshold: number): string[] {
    const unhealthy: string[] = [];
    for (const [domainId, history] of this.metrics) {
      const latest = history[history.length - 1];
      if (latest && latest.overallHealth < threshold) unhealthy.push(domainId);
    }
    return unhealthy;
  }

  getAverageHealth(domainId: string): number {
    const history = this.metrics.get(domainId) || [];
    if (!history.length) return 0;
    return history.reduce((sum, m) => sum + m.overallHealth, 0) / history.length;
  }
}

class DataDomainLineageTracker {
  private edges: Array<{ from: string; to: string; type: string; timestamp: number }> = [];

  recordDependency(fromDomain: string, toDomain: string, type: 'consumes' | 'produces' | 'transforms'): void {
    this.edges.push({ from: fromDomain, to: toDomain, type, timestamp: Date.now() });
    logger.debug('Domain dependency recorded', { fromDomain, toDomain, type });
  }

  getUpstream(domainId: string): string[] {
    return [...new Set(this.edges.filter(e => e.to === domainId).map(e => e.from))];
  }

  getDownstream(domainId: string): string[] {
    return [...new Set(this.edges.filter(e => e.from === domainId).map(e => e.to))];
  }

  getImpactedDomains(domainId: string): string[] {
    const impacted = new Set<string>();
    const queue = [domainId];
    while (queue.length) {
      const current = queue.shift()!;
      for (const downstream of this.getDownstream(current)) {
        if (!impacted.has(downstream)) { impacted.add(downstream); queue.push(downstream); }
      }
    }
    return Array.from(impacted);
  }

  getAllEdges(): Array<{ from: string; to: string; type: string }> {
    return this.edges.map(({ from, to, type }) => ({ from, to, type }));
  }
}

export const dataDomainRegistry = new DataDomainRegistry();
export const dataDomainGovernor = new DataDomainGovernor();
export const dataDomainMetricsCollector = new DataDomainMetricsCollector();
export const dataDomainLineageTracker = new DataDomainLineageTracker();

export { DataDomain, DomainPolicy, DomainHealthMetric };
