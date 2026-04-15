/**
 * Phase 247: Architecture Intelligence
 * Service dependency mapping, architecture health, design pattern compliance, ADR management
 */

import { logger } from './logger';

interface ServiceNode {
  serviceId: string;
  name: string;
  type: 'microservice' | 'monolith' | 'gateway' | 'database' | 'queue' | 'cache' | 'external';
  team: string;
  language: string;
  deploymentUnit: string;
  slaTarget: number;    // uptime %
  criticalityLevel: 'critical' | 'high' | 'medium' | 'low';
  registeredAt: number;
}

interface ServiceDependency {
  dependencyId: string;
  fromServiceId: string;
  toServiceId: string;
  dependencyType: 'sync' | 'async' | 'db' | 'cache' | 'event';
  criticality: 'blocking' | 'non_blocking';
  avgLatencyMs: number;
  errorRatePct: number;
  createdAt: number;
}

interface ArchitectureHealthScore {
  healthId: string;
  period: string;
  couplingScore: number;       // 0-100 (higher = looser coupling = better)
  cohesionScore: number;       // 0-100
  scalabilityScore: number;    // 0-100
  resilienceScore: number;     // 0-100
  observabilityScore: number;  // 0-100
  overallScore: number;
  findings: string[];
  calculatedAt: number;
}

interface ArchitectureDecisionRecord {
  adrId: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  context: string;
  decision: string;
  consequences: string[];
  alternatives: string[];
  author: string;
  createdAt: number;
  supersededBy?: string;
}

class ServiceRegistry {
  private services: Map<string, ServiceNode> = new Map();
  private counter = 0;

  register(name: string, type: ServiceNode['type'], team: string, language: string, deploymentUnit: string, slaTarget: number, criticality: ServiceNode['criticalityLevel']): ServiceNode {
    const serviceId = `svc-${Date.now()}-${++this.counter}`;
    const service: ServiceNode = {
      serviceId, name, type, team, language, deploymentUnit, slaTarget, criticalityLevel: criticality, registeredAt: Date.now()
    };
    this.services.set(serviceId, service);
    logger.debug('Service registered', { serviceId, name, type, criticality });
    return service;
  }

  getByType(type: ServiceNode['type']): ServiceNode[] {
    return Array.from(this.services.values()).filter(s => s.type === type);
  }

  getCriticalServices(): ServiceNode[] {
    return Array.from(this.services.values()).filter(s => s.criticalityLevel === 'critical');
  }

  getService(serviceId: string): ServiceNode | undefined {
    return this.services.get(serviceId);
  }

  getAllServices(): ServiceNode[] {
    return Array.from(this.services.values());
  }
}

class ServiceDependencyMapper {
  private dependencies: Map<string, ServiceDependency[]> = new Map();
  private counter = 0;

  map(fromServiceId: string, toServiceId: string, type: ServiceDependency['dependencyType'], criticality: ServiceDependency['criticality'], avgLatencyMs: number): ServiceDependency {
    const dependencyId = `dep-${Date.now()}-${++this.counter}`;
    const dep: ServiceDependency = {
      dependencyId, fromServiceId, toServiceId, dependencyType: type,
      criticality, avgLatencyMs, errorRatePct: 0, createdAt: Date.now()
    };
    const existing = this.dependencies.get(fromServiceId) || [];
    existing.push(dep);
    this.dependencies.set(fromServiceId, existing);
    return dep;
  }

  updateErrorRate(dependencyId: string, errorRatePct: number): boolean {
    for (const deps of this.dependencies.values()) {
      const dep = deps.find(d => d.dependencyId === dependencyId);
      if (dep) { dep.errorRatePct = errorRatePct; return true; }
    }
    return false;
  }

  getDependencies(serviceId: string): ServiceDependency[] {
    return this.dependencies.get(serviceId) || [];
  }

  getHighErrorDependencies(threshold = 5): ServiceDependency[] {
    return Array.from(this.dependencies.values()).flat()
      .filter(d => d.errorRatePct >= threshold)
      .sort((a, b) => b.errorRatePct - a.errorRatePct);
  }

  getDependencyCount(serviceId: string): number {
    return (this.dependencies.get(serviceId) || []).length;
  }
}

class ArchitectureHealthAnalyzer {
  private scores: ArchitectureHealthScore[] = [];
  private counter = 0;

  analyze(period: string, coupling: number, cohesion: number, scalability: number, resilience: number, observability: number, findings: string[]): ArchitectureHealthScore {
    const overall = coupling * 0.2 + cohesion * 0.2 + scalability * 0.2 + resilience * 0.25 + observability * 0.15;
    const healthId = `archhealth-${Date.now()}-${++this.counter}`;
    const score: ArchitectureHealthScore = {
      healthId, period, couplingScore: coupling, cohesionScore: cohesion,
      scalabilityScore: scalability, resilienceScore: resilience, observabilityScore: observability,
      overallScore: Math.max(0, Math.min(100, overall)), findings, calculatedAt: Date.now()
    };
    this.scores.push(score);
    logger.debug('Architecture health analyzed', { period, overallScore: score.overallScore });
    return score;
  }

  getLatest(): ArchitectureHealthScore | undefined {
    return this.scores[this.scores.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.scores.length < 2) return 'stable';
    const diff = this.scores[this.scores.length - 1].overallScore - this.scores[this.scores.length - 2].overallScore;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }
}

class ADRManager {
  private adrs: Map<string, ArchitectureDecisionRecord> = new Map();
  private counter = 0;

  create(title: string, context: string, decision: string, consequences: string[], alternatives: string[], author: string): ArchitectureDecisionRecord {
    const adrId = `adr-${Date.now()}-${++this.counter}`;
    const adr: ArchitectureDecisionRecord = {
      adrId, title, status: 'proposed', context, decision,
      consequences, alternatives, author, createdAt: Date.now()
    };
    this.adrs.set(adrId, adr);
    return adr;
  }

  accept(adrId: string): boolean {
    const adr = this.adrs.get(adrId);
    if (!adr) return false;
    adr.status = 'accepted';
    return true;
  }

  supersede(adrId: string, newAdrId: string): boolean {
    const adr = this.adrs.get(adrId);
    if (!adr) return false;
    adr.status = 'superseded';
    adr.supersededBy = newAdrId;
    return true;
  }

  getActive(): ArchitectureDecisionRecord[] {
    return Array.from(this.adrs.values()).filter(a => a.status === 'accepted');
  }

  getADR(adrId: string): ArchitectureDecisionRecord | undefined {
    return this.adrs.get(adrId);
  }
}

export const serviceRegistry = new ServiceRegistry();
export const serviceDependencyMapper = new ServiceDependencyMapper();
export const architectureHealthAnalyzer = new ArchitectureHealthAnalyzer();
export const adrManager = new ADRManager();

export { ServiceNode, ServiceDependency, ArchitectureHealthScore, ArchitectureDecisionRecord };
