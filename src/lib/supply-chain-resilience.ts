/**
 * Phase 212: Supply Chain Resilience
 * Resilience scoring, disruption simulation, alternative sourcing, recovery time estimation
 */

import { logger } from './logger';

interface ResilienceScore {
  scoreId: string;
  nodeId: string; // supplier or facility ID
  nodeName: string;
  supplierDiversity: number;   // 0-100
  inventoryBuffer: number;     // days of cover
  geographicSpread: number;    // 0-100
  financialStability: number;  // 0-100
  overallScore: number;        // 0-100
  resilientLevel: 'high' | 'medium' | 'low' | 'critical';
  assessedAt: number;
}

interface DisruptionScenario {
  scenarioId: string;
  name: string;
  type: 'natural_disaster' | 'supplier_failure' | 'logistics_disruption' | 'geopolitical' | 'cyber_attack' | 'pandemic';
  probability: number;  // 0-1
  impactSeverity: 'catastrophic' | 'major' | 'moderate' | 'minor';
  affectedNodes: string[];
  estimatedImpactDays: number;
  estimatedRevenueLoss: number;
  mitigationStrategies: string[];
  createdAt: number;
}

interface AlternativeSource {
  sourceId: string;
  primarySupplierId: string;
  alternativeSupplierId: string;
  alternativeSupplierName: string;
  category: string;
  qualificationStatus: 'not_started' | 'in_progress' | 'qualified' | 'active';
  leadTimeDays: number;
  pricePremiumPct: number;
  capacityAvailable: number;
  createdAt: number;
}

interface RecoveryTimeEstimate {
  estimateId: string;
  scenarioId: string;
  nodeId: string;
  rtoHours: number;   // Recovery Time Objective
  rpoHours: number;   // Recovery Point Objective
  mttrDays: number;   // Mean Time to Recovery
  withMitigationDays: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  estimatedAt: number;
}

class ResilienceScoreCalculator {
  private scores: Map<string, ResilienceScore> = new Map();
  private counter = 0;

  calculate(nodeId: string, nodeName: string, supplierDiversity: number, inventoryBufferDays: number, geographicSpread: number, financialStability: number): ResilienceScore {
    const bufferScore = Math.min(100, inventoryBufferDays * 5);
    const overallScore = supplierDiversity * 0.3 + bufferScore * 0.25 + geographicSpread * 0.25 + financialStability * 0.2;
    const resilientLevel: ResilienceScore['resilientLevel'] =
      overallScore >= 70 ? 'high' : overallScore >= 50 ? 'medium' : overallScore >= 30 ? 'low' : 'critical';

    const scoreId = `resil-${Date.now()}-${++this.counter}`;
    const score: ResilienceScore = {
      scoreId, nodeId, nodeName, supplierDiversity,
      inventoryBuffer: inventoryBufferDays, geographicSpread, financialStability,
      overallScore, resilientLevel, assessedAt: Date.now()
    };
    this.scores.set(nodeId, score);
    logger.debug('Resilience score calculated', { nodeId, overallScore: overallScore.toFixed(1), resilientLevel });
    return score;
  }

  getScore(nodeId: string): ResilienceScore | undefined {
    return this.scores.get(nodeId);
  }

  getCriticalNodes(): ResilienceScore[] {
    return Array.from(this.scores.values())
      .filter(s => s.resilientLevel === 'critical' || s.resilientLevel === 'low')
      .sort((a, b) => a.overallScore - b.overallScore);
  }

  getPortfolioAvgScore(): number {
    const scores = Array.from(this.scores.values());
    if (!scores.length) return 0;
    return scores.reduce((s, r) => s + r.overallScore, 0) / scores.length;
  }
}

class DisruptionSimulator {
  private scenarios: Map<string, DisruptionScenario> = new Map();
  private counter = 0;

  createScenario(name: string, type: DisruptionScenario['type'], probability: number, severity: DisruptionScenario['impactSeverity'], affectedNodes: string[], impactDays: number, revenueLoss: number, strategies: string[]): DisruptionScenario {
    const scenarioId = `disrupt-${Date.now()}-${++this.counter}`;
    const scenario: DisruptionScenario = {
      scenarioId, name, type, probability: Math.max(0, Math.min(1, probability)),
      impactSeverity: severity, affectedNodes, estimatedImpactDays: impactDays,
      estimatedRevenueLoss: revenueLoss, mitigationStrategies: strategies, createdAt: Date.now()
    };
    this.scenarios.set(scenarioId, scenario);
    logger.debug('Disruption scenario created', { scenarioId, name, type, probability });
    return scenario;
  }

  calculateExpectedLoss(scenarioId: string): number {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return 0;
    return scenario.probability * scenario.estimatedRevenueLoss;
  }

  getHighProbabilityScenarios(threshold = 0.3): DisruptionScenario[] {
    return Array.from(this.scenarios.values())
      .filter(s => s.probability >= threshold)
      .sort((a, b) => b.probability - a.probability);
  }

  getTotalExpectedLoss(): number {
    return Array.from(this.scenarios.values()).reduce((s, sc) => s + this.calculateExpectedLoss(sc.scenarioId), 0);
  }

  getScenario(scenarioId: string): DisruptionScenario | undefined {
    return this.scenarios.get(scenarioId);
  }
}

class AlternativeSourceManager {
  private sources: Map<string, AlternativeSource[]> = new Map();
  private counter = 0;

  register(primarySupplierId: string, alternativeSupplierId: string, alternativeSupplierName: string, category: string, leadTimeDays: number, pricePremiumPct: number, capacityAvailable: number): AlternativeSource {
    const sourceId = `altsource-${Date.now()}-${++this.counter}`;
    const source: AlternativeSource = {
      sourceId, primarySupplierId, alternativeSupplierId, alternativeSupplierName,
      category, qualificationStatus: 'not_started',
      leadTimeDays, pricePremiumPct, capacityAvailable, createdAt: Date.now()
    };
    const existing = this.sources.get(primarySupplierId) || [];
    existing.push(source);
    this.sources.set(primarySupplierId, existing);
    return source;
  }

  qualify(sourceId: string): boolean {
    for (const sources of this.sources.values()) {
      const source = sources.find(s => s.sourceId === sourceId);
      if (source) { source.qualificationStatus = 'qualified'; return true; }
    }
    return false;
  }

  getAlternatives(primarySupplierId: string, qualified = true): AlternativeSource[] {
    return (this.sources.get(primarySupplierId) || [])
      .filter(s => !qualified || s.qualificationStatus === 'qualified' || s.qualificationStatus === 'active');
  }

  getSuppliersWithNoAlternative(supplierIds: string[]): string[] {
    return supplierIds.filter(id => !this.sources.has(id) || this.getAlternatives(id).length === 0);
  }
}

class RecoveryTimeEstimator {
  private estimates: Map<string, RecoveryTimeEstimate> = new Map();
  private counter = 0;

  estimate(scenarioId: string, nodeId: string, rtoHours: number, rpoHours: number, mttrDays: number, withMitigationDays: number, confidence: RecoveryTimeEstimate['confidenceLevel']): RecoveryTimeEstimate {
    const estimateId = `rte-${Date.now()}-${++this.counter}`;
    const estimate: RecoveryTimeEstimate = {
      estimateId, scenarioId, nodeId, rtoHours, rpoHours, mttrDays,
      withMitigationDays, confidenceLevel: confidence, estimatedAt: Date.now()
    };
    this.estimates.set(`${scenarioId}:${nodeId}`, estimate);
    logger.debug('Recovery time estimated', { estimateId, scenarioId, nodeId, mttrDays, withMitigationDays });
    return estimate;
  }

  getMitigationBenefit(scenarioId: string, nodeId: string): number {
    const estimate = this.estimates.get(`${scenarioId}:${nodeId}`);
    if (!estimate) return 0;
    return estimate.mttrDays - estimate.withMitigationDays;
  }

  getEstimate(scenarioId: string, nodeId: string): RecoveryTimeEstimate | undefined {
    return this.estimates.get(`${scenarioId}:${nodeId}`);
  }

  getWorstCaseRecovery(): RecoveryTimeEstimate | undefined {
    return Array.from(this.estimates.values()).sort((a, b) => b.mttrDays - a.mttrDays)[0];
  }
}

export const resilienceScoreCalculator = new ResilienceScoreCalculator();
export const disruptionSimulator = new DisruptionSimulator();
export const alternativeSourceManager = new AlternativeSourceManager();
export const recoveryTimeEstimator = new RecoveryTimeEstimator();

export { ResilienceScore, DisruptionScenario, AlternativeSource, RecoveryTimeEstimate };
