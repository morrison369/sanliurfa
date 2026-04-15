/**
 * Phase 264: Supply Network Intelligence
 * Multi-tier supplier mapping, network resilience, disruption simulation, alternate sourcing
 */

import { logger } from './logger';

interface SupplierNode {
  nodeId: string;
  supplierId: string;
  supplierName: string;
  tier: 1 | 2 | 3;   // 1 = direct, 2 = supplier's supplier, 3 = nth tier
  country: string;
  category: string;
  annualRevenue: number;
  capacityUtilizationPct: number;
  leadTimeDays: number;
  qualityScore: number;     // 0-100
  reliabilityScore: number; // 0-100
  riskScore: number;        // 0-100 (higher = more risk)
  registeredAt: number;
}

interface SupplyChainLink {
  linkId: string;
  fromNodeId: string;
  toNodeId: string;
  materialCategory: string;
  annualVolume: number;
  criticalPath: boolean;     // part of minimum spanning path to end product
  alternateSourceAvailable: boolean;
  singleSourceRisk: boolean;
  leadTimeDays: number;
  createdAt: number;
}

interface DisruptionScenario {
  scenarioId: string;
  name: string;
  disruptionType: 'supplier_failure' | 'natural_disaster' | 'geopolitical' | 'logistics' | 'cyber';
  affectedNodeIds: string[];
  probabilityPct: number;
  estimatedImpactDays: number;
  revenueAtRisk: number;
  mitigationOptions: string[];
  residualRiskAfterMitigation: number;  // 0-100
  createdAt: number;
}

interface NetworkResilienceScore {
  scoreId: string;
  period: string;
  diversificationScore: number;   // geographic/supplier diversity
  redundancyScore: number;        // alternate source availability
  visibilityScore: number;        // % of network mapped
  agilityScore: number;           // avg lead time inverse
  overallResilience: number;      // weighted composite
  vulnerableLinks: number;        // single-source critical path links
  calculatedAt: number;
}

class SupplierNetworkMapper {
  private nodes: Map<string, SupplierNode> = new Map();
  private counter = 0;

  addNode(supplierId: string, supplierName: string, tier: SupplierNode['tier'], country: string, category: string, annualRevenue: number, capacityUtilPct: number, leadTimeDays: number, qualityScore: number, reliabilityScore: number): SupplierNode {
    const riskScore = Math.max(0, 100 - qualityScore * 0.4 - reliabilityScore * 0.4 - Math.max(0, 100 - capacityUtilPct) * 0.2);
    const nodeId = `supnode-${Date.now()}-${++this.counter}`;
    const node: SupplierNode = {
      nodeId, supplierId, supplierName, tier, country, category, annualRevenue,
      capacityUtilizationPct: capacityUtilPct, leadTimeDays, qualityScore, reliabilityScore,
      riskScore, registeredAt: Date.now()
    };
    this.nodes.set(nodeId, node);
    logger.debug('Supplier node added', { nodeId, supplierName, tier });
    return node;
  }

  getByTier(tier: SupplierNode['tier']): SupplierNode[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  getHighRisk(threshold = 60): SupplierNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  getGeographicConcentration(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const n of this.nodes.values()) counts[n.country] = (counts[n.country] || 0) + 1;
    return counts;
  }

  getNode(nodeId: string): SupplierNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): SupplierNode[] {
    return Array.from(this.nodes.values());
  }
}

class SupplyChainLinkTracker {
  private links: SupplyChainLink[] = [];
  private counter = 0;

  add(fromNodeId: string, toNodeId: string, materialCategory: string, annualVolume: number, criticalPath: boolean, alternateAvailable: boolean, leadTimeDays: number): SupplyChainLink {
    const linkId = `sclink-${Date.now()}-${++this.counter}`;
    const link: SupplyChainLink = {
      linkId, fromNodeId, toNodeId, materialCategory, annualVolume, criticalPath,
      alternateSourceAvailable: alternateAvailable, singleSourceRisk: criticalPath && !alternateAvailable,
      leadTimeDays, createdAt: Date.now()
    };
    this.links.push(link);
    return link;
  }

  getVulnerableLinks(): SupplyChainLink[] {
    return this.links.filter(l => l.singleSourceRisk);
  }

  getCriticalPathLinks(): SupplyChainLink[] {
    return this.links.filter(l => l.criticalPath);
  }

  getTotalAnnualVolume(): number {
    return this.links.reduce((s, l) => s + l.annualVolume, 0);
  }
}

class DisruptionSimulator {
  private scenarios: Map<string, DisruptionScenario> = new Map();
  private counter = 0;

  create(name: string, disruptionType: DisruptionScenario['disruptionType'], affectedNodeIds: string[], probabilityPct: number, impactDays: number, revenueAtRisk: number, mitigationOptions: string[]): DisruptionScenario {
    const residualRisk = Math.max(0, probabilityPct * 0.3);  // mitigation reduces risk by 70%
    const scenarioId = `disruption-${Date.now()}-${++this.counter}`;
    const scenario: DisruptionScenario = {
      scenarioId, name, disruptionType, affectedNodeIds, probabilityPct, estimatedImpactDays: impactDays,
      revenueAtRisk, mitigationOptions, residualRiskAfterMitigation: residualRisk, createdAt: Date.now()
    };
    this.scenarios.set(scenarioId, scenario);
    return scenario;
  }

  getWorstCase(): DisruptionScenario | undefined {
    return Array.from(this.scenarios.values())
      .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)[0];
  }

  getHighProbability(threshold = 30): DisruptionScenario[] {
    return Array.from(this.scenarios.values())
      .filter(s => s.probabilityPct >= threshold)
      .sort((a, b) => b.probabilityPct - a.probabilityPct);
  }

  getTotalRevenueAtRisk(): number {
    return Array.from(this.scenarios.values()).reduce((s, sc) => s + sc.revenueAtRisk, 0);
  }
}

class NetworkResilienceScorer {
  private scores: NetworkResilienceScore[] = [];
  private counter = 0;

  score(period: string, diversification: number, redundancy: number, visibility: number, agility: number, vulnerableLinks: number): NetworkResilienceScore {
    const overall = diversification * 0.25 + redundancy * 0.3 + visibility * 0.2 + agility * 0.25;

    const scoreId = `netresil-${Date.now()}-${++this.counter}`;
    const record: NetworkResilienceScore = {
      scoreId, period,
      diversificationScore: Math.max(0, Math.min(100, diversification)),
      redundancyScore: Math.max(0, Math.min(100, redundancy)),
      visibilityScore: Math.max(0, Math.min(100, visibility)),
      agilityScore: Math.max(0, Math.min(100, agility)),
      overallResilience: Math.max(0, Math.min(100, overall)),
      vulnerableLinks, calculatedAt: Date.now()
    };
    this.scores.push(record);
    return record;
  }

  getLatest(): NetworkResilienceScore | undefined {
    return this.scores[this.scores.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.scores.length < 2) return 'stable';
    const diff = this.scores[this.scores.length - 1].overallResilience - this.scores[this.scores.length - 2].overallResilience;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }
}

export const supplierNetworkMapper = new SupplierNetworkMapper();
export const supplyChainLinkTracker = new SupplyChainLinkTracker();
export const disruptionSimulator = new DisruptionSimulator();
export const networkResilienceScorer = new NetworkResilienceScorer();

export { SupplierNode, SupplyChainLink, DisruptionScenario, NetworkResilienceScore };
