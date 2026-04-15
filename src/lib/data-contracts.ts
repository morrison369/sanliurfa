/**
 * Phase 181: Data Contracts
 * Contract management, validation, monitoring, breach handling
 */

import { logger } from './logger';

interface DataContract {
  contractId: string;
  name: string;
  producerDomain: string;
  consumerDomain: string;
  schema: Record<string, { type: string; nullable: boolean; description?: string }>;
  sla: { freshnessHours: number; availabilityPct: number; latencyMs: number };
  version: string;
  createdAt: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  expiresAt?: number;
}

interface ValidationResult {
  contractId: string;
  valid: boolean;
  violations: Array<{ field: string; issue: string; severity: 'error' | 'warning' }>;
  validatedAt: number;
}

interface ContractBreach {
  breachId: string;
  contractId: string;
  type: 'schema' | 'sla' | 'availability' | 'freshness';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  resolvedAt?: number;
}

class DataContractManager {
  private contracts: Map<string, DataContract> = new Map();
  private counter = 0;

  create(name: string, producerDomain: string, consumerDomain: string, schema: DataContract['schema'], sla: DataContract['sla']): DataContract {
    const contractId = `contract-${Date.now()}-${++this.counter}`;
    const contract: DataContract = {
      contractId, name, producerDomain, consumerDomain,
      schema, sla, version: '1.0',
      createdAt: Date.now(), status: 'draft'
    };
    this.contracts.set(contractId, contract);
    logger.debug('Data contract created', { contractId, name, producerDomain, consumerDomain });
    return contract;
  }

  activate(contractId: string, expiresAt?: number): DataContract | undefined {
    const contract = this.contracts.get(contractId);
    if (contract) {
      contract.status = 'active';
      contract.expiresAt = expiresAt;
      logger.debug('Data contract activated', { contractId });
      return contract;
    }
    return undefined;
  }

  terminate(contractId: string): DataContract | undefined {
    const contract = this.contracts.get(contractId);
    if (contract) { contract.status = 'terminated'; return contract; }
    return undefined;
  }

  getContract(contractId: string): DataContract | undefined {
    return this.contracts.get(contractId);
  }

  getActiveContracts(domainId?: string): DataContract[] {
    return Array.from(this.contracts.values()).filter(c =>
      c.status === 'active' && (!domainId || c.producerDomain === domainId || c.consumerDomain === domainId)
    );
  }

  getExpiredContracts(): DataContract[] {
    return Array.from(this.contracts.values()).filter(c =>
      c.expiresAt && c.expiresAt <= Date.now() && c.status === 'active'
    );
  }
}

class DataContractValidator {
  validate(contract: DataContract, data: Record<string, any>): ValidationResult {
    const violations: ValidationResult['violations'] = [];

    for (const [field, def] of Object.entries(contract.schema)) {
      const value = data[field];

      if (value === undefined || value === null) {
        if (!def.nullable) {
          violations.push({ field, issue: 'Required field is null/missing', severity: 'error' });
        }
        continue;
      }

      // Type checking
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (def.type !== actualType && def.type !== 'any') {
        violations.push({ field, issue: `Expected ${def.type}, got ${actualType}`, severity: 'error' });
      }
    }

    // Check for unexpected fields
    for (const key of Object.keys(data)) {
      if (!contract.schema[key]) {
        violations.push({ field: key, issue: 'Unexpected field not in schema', severity: 'warning' });
      }
    }

    logger.debug('Contract validated', {
      contractId: contract.contractId,
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations: violations.length
    });

    return {
      contractId: contract.contractId,
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      validatedAt: Date.now()
    };
  }

  validateBatch(contract: DataContract, records: Record<string, any>[]): { passed: number; failed: number; totalViolations: number } {
    let passed = 0; let failed = 0; let totalViolations = 0;
    for (const record of records) {
      const result = this.validate(contract, record);
      if (result.valid) passed++; else failed++;
      totalViolations += result.violations.filter(v => v.severity === 'error').length;
    }
    return { passed, failed, totalViolations };
  }
}

class DataContractMonitor {
  private slaMetrics: Map<string, Array<{ freshnessHours: number; availabilityPct: number; latencyMs: number; recordedAt: number }>> = new Map();

  recordSLAMetrics(contractId: string, freshnessHours: number, availabilityPct: number, latencyMs: number): void {
    const existing = this.slaMetrics.get(contractId) || [];
    existing.push({ freshnessHours, availabilityPct, latencyMs, recordedAt: Date.now() });
    this.slaMetrics.set(contractId, existing);
  }

  checkSLACompliance(contract: DataContract): { compliant: boolean; violations: string[] } {
    const metrics = this.slaMetrics.get(contract.contractId) || [];
    if (!metrics.length) return { compliant: true, violations: [] };

    const latest = metrics[metrics.length - 1];
    const violations: string[] = [];

    if (latest.freshnessHours > contract.sla.freshnessHours) {
      violations.push(`Data freshness ${latest.freshnessHours}h exceeds SLA ${contract.sla.freshnessHours}h`);
    }
    if (latest.availabilityPct < contract.sla.availabilityPct) {
      violations.push(`Availability ${latest.availabilityPct}% below SLA ${contract.sla.availabilityPct}%`);
    }
    if (latest.latencyMs > contract.sla.latencyMs) {
      violations.push(`Latency ${latest.latencyMs}ms exceeds SLA ${contract.sla.latencyMs}ms`);
    }

    return { compliant: violations.length === 0, violations };
  }

  getLatestMetrics(contractId: string) {
    const metrics = this.slaMetrics.get(contractId) || [];
    return metrics[metrics.length - 1];
  }
}

class DataContractBreachHandler {
  private breaches: Map<string, ContractBreach> = new Map();
  private counter = 0;

  reportBreach(contractId: string, type: ContractBreach['type'], description: string, severity: ContractBreach['severity']): ContractBreach {
    const breachId = `breach-${Date.now()}-${++this.counter}`;
    const breach: ContractBreach = { breachId, contractId, type, description, severity, detectedAt: Date.now() };
    this.breaches.set(breachId, breach);
    logger.debug('Contract breach reported', { breachId, contractId, type, severity });
    return breach;
  }

  resolveBreach(breachId: string): ContractBreach | undefined {
    const breach = this.breaches.get(breachId);
    if (breach) { breach.resolvedAt = Date.now(); return breach; }
    return undefined;
  }

  getOpenBreaches(contractId?: string): ContractBreach[] {
    return Array.from(this.breaches.values()).filter(b =>
      !b.resolvedAt && (!contractId || b.contractId === contractId)
    );
  }

  getCriticalBreaches(): ContractBreach[] {
    return Array.from(this.breaches.values()).filter(b => b.severity === 'critical' && !b.resolvedAt);
  }

  getBreachHistory(contractId: string): ContractBreach[] {
    return Array.from(this.breaches.values()).filter(b => b.contractId === contractId);
  }
}

export const dataContractManager = new DataContractManager();
export const dataContractValidator = new DataContractValidator();
export const dataContractMonitor = new DataContractMonitor();
export const dataContractBreachHandler = new DataContractBreachHandler();

export { DataContract, ValidationResult, ContractBreach };
