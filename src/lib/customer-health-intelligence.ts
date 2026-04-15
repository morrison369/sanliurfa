/**
 * Phase 320: Customer Health Intelligence
 * Health scoring, churn prediction, expansion signals, lifecycle management
 */

import { logger } from './logger';

interface CustomerHealthRecord {
  healthId: string;
  customerId: string;
  customerName: string;
  tier: 'enterprise' | 'mid_market' | 'smb' | 'startup';
  healthScore: number;            // 0-100
  healthCategory: 'healthy' | 'neutral' | 'at_risk' | 'critical';
  // Component scores (0-100 each)
  productUsageScore: number;
  supportScore: number;
  engagementScore: number;
  paymentScore: number;
  npsScore: number;
  adoptionScore: number;
  // Signals
  daysInactive: number;
  openSupportTickets: number;
  overduePayments: number;
  featureAdoptionPct: number;
  loginFrequencyPerMonth: number;
  // Value metrics
  arr: number;                    // Annual Recurring Revenue
  expansionPotentialUSD: number;
  churnRiskPct: number;
  churnRiskCategory: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: number;
  createdAt: number;
}

interface ChurnPredictionRecord {
  predictionId: string;
  customerId: string;
  customerName: string;
  churnProbabilityPct: number;
  churnTimeframeMonths: number;
  topRiskFactors: string[];
  estimatedRevenueLossUSD: number;
  recommendedActions: string[];
  preventionPriorityScore: number;  // higher = intervene sooner
  previousPredictionPct?: number;
  trend: 'improving' | 'stable' | 'worsening';
  predictedAt: number;
}

interface ExpansionSignalRecord {
  signalId: string;
  customerId: string;
  customerName: string;
  signalType: 'usage_limit_approaching' | 'feature_gap' | 'seat_expansion' | 'upsell_readiness' | 'cross_sell';
  signalStrength: 'strong' | 'moderate' | 'weak';
  expansionOpportunityUSD: number;
  evidence: string[];
  recommendedProduct?: string;
  recommendedAction: string;
  expiryDate?: number;
  isActioned: boolean;
  detectedAt: number;
}

interface LifecycleStageRecord {
  stageId: string;
  customerId: string;
  customerName: string;
  currentStage: 'onboarding' | 'adopting' | 'established' | 'expanding' | 'at_risk' | 'churned';
  previousStage?: string;
  stageEnteredAt: number;
  daysInStage: number;
  stageHealthScore: number;
  nextMilestone: string;
  daysToNextMilestone: number;
  isOnTrack: boolean;
  csm?: string;                   // Customer Success Manager
  nextActionDue: number;
  updatedAt: number;
}

class CustomerHealthEngine {
  private healthRecords: Map<string, CustomerHealthRecord> = new Map();
  private counter = 0;

  calculate(customerId: string, customerName: string, tier: CustomerHealthRecord['tier'], productUsage: number, supportScore: number, engagementScore: number, paymentScore: number, nps: number, adoption: number, arr: number, daysInactive: number, openTickets: number, overduePayments: number, loginFreq: number, featureAdoptionPct: number): CustomerHealthRecord {
    const healthId = `health-${Date.now()}-${++this.counter}`;
    // Weighted composite score
    const healthScore = Math.round(
      productUsage * 0.25 + supportScore * 0.15 + engagementScore * 0.20 +
      paymentScore * 0.20 + nps * 0.10 + adoption * 0.10
    );
    const healthCategory: CustomerHealthRecord['healthCategory'] =
      healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'neutral' : healthScore >= 25 ? 'at_risk' : 'critical';
    const churnRiskPct = Math.max(0, Math.min(100, 100 - healthScore));
    const churnRiskCategory: CustomerHealthRecord['churnRiskCategory'] =
      churnRiskPct >= 75 ? 'critical' : churnRiskPct >= 50 ? 'high' : churnRiskPct >= 25 ? 'medium' : 'low';
    const expansionPotential = healthScore >= 70 && featureAdoptionPct >= 80 ? arr * 0.3 : arr * 0.1;

    const record: CustomerHealthRecord = {
      healthId, customerId, customerName, tier, healthScore, healthCategory,
      productUsageScore: productUsage, supportScore, engagementScore, paymentScore,
      npsScore: nps, adoptionScore: adoption,
      daysInactive, openSupportTickets: openTickets, overduePayments,
      featureAdoptionPct, loginFrequencyPerMonth: loginFreq,
      arr, expansionPotentialUSD: Math.round(expansionPotential),
      churnRiskPct: Math.round(churnRiskPct * 10) / 10,
      churnRiskCategory, lastUpdated: Date.now(), createdAt: Date.now()
    };
    this.healthRecords.set(customerId, record);
    logger.debug('Customer health calculated', { customerId, healthScore, healthCategory, churnRiskCategory });
    return record;
  }

  getAtRisk(): CustomerHealthRecord[] {
    return Array.from(this.healthRecords.values())
      .filter(h => h.healthCategory === 'at_risk' || h.healthCategory === 'critical')
      .sort((a, b) => a.healthScore - b.healthScore);
  }

  getHealthyCustomers(): CustomerHealthRecord[] {
    return Array.from(this.healthRecords.values()).filter(h => h.healthCategory === 'healthy');
  }

  getCustomerHealth(customerId: string): CustomerHealthRecord | undefined {
    return this.healthRecords.get(customerId);
  }

  getAverageHealthScore(): number {
    const all = Array.from(this.healthRecords.values());
    return all.length > 0 ? Math.round(all.reduce((s, h) => s + h.healthScore, 0) / all.length * 10) / 10 : 0;
  }

  getAll(): CustomerHealthRecord[] {
    return Array.from(this.healthRecords.values());
  }
}

class ChurnPredictor {
  private predictions: ChurnPredictionRecord[] = [];
  private counter = 0;

  predict(health: CustomerHealthRecord): ChurnPredictionRecord {
    const predictionId = `churnpred-${Date.now()}-${++this.counter}`;
    const churnProbability = health.churnRiskPct;

    const riskFactors: string[] = [];
    if (health.daysInactive > 30) riskFactors.push(`${health.daysInactive} days inactive`);
    if (health.openSupportTickets > 3) riskFactors.push(`${health.openSupportTickets} open support tickets`);
    if (health.overduePayments > 0) riskFactors.push(`${health.overduePayments} overdue payments`);
    if (health.featureAdoptionPct < 30) riskFactors.push(`Low feature adoption (${health.featureAdoptionPct}%)`);
    if (health.loginFrequencyPerMonth < 2) riskFactors.push('Minimal login activity');
    if (health.npsScore < 40) riskFactors.push('Low NPS score');

    const actions: string[] = [];
    if (churnProbability >= 75) actions.push('Schedule executive business review immediately');
    if (health.daysInactive > 30) actions.push('Proactive re-engagement outreach');
    if (health.featureAdoptionPct < 40) actions.push('Book product training/enablement session');
    if (health.openSupportTickets > 3) actions.push('Escalate and resolve open tickets');
    if (health.overduePayments > 0) actions.push('Coordinate with finance on payment resolution');

    const churnTimeframe = churnProbability >= 75 ? 1 : churnProbability >= 50 ? 3 : 6;
    const preventionPriority = Math.round(churnProbability * 0.6 + (health.arr / 10000) * 0.4);

    const prev = this.predictions.filter(p => p.customerId === health.customerId).slice(-1)[0];
    const trend: ChurnPredictionRecord['trend'] = prev
      ? (churnProbability < prev.churnProbabilityPct - 5 ? 'improving' : churnProbability > prev.churnProbabilityPct + 5 ? 'worsening' : 'stable')
      : 'stable';

    const record: ChurnPredictionRecord = {
      predictionId, customerId: health.customerId, customerName: health.customerName,
      churnProbabilityPct: Math.round(churnProbability * 10) / 10,
      churnTimeframeMonths: churnTimeframe, topRiskFactors: riskFactors,
      estimatedRevenueLossUSD: Math.round(health.arr * (churnTimeframe / 12)),
      recommendedActions: actions, preventionPriorityScore: Math.min(100, preventionPriority),
      previousPredictionPct: prev?.churnProbabilityPct, trend, predictedAt: Date.now()
    };
    this.predictions.push(record);
    return record;
  }

  getHighRisk(threshold = 60): ChurnPredictionRecord[] {
    return this.predictions
      .filter(p => p.churnProbabilityPct >= threshold)
      .sort((a, b) => b.preventionPriorityScore - a.preventionPriorityScore);
  }

  getTotalRevenueAtRisk(): number {
    const seen = new Set<string>();
    return this.predictions
      .filter(p => { if (seen.has(p.customerId)) return false; seen.add(p.customerId); return p.churnProbabilityPct >= 50; })
      .reduce((s, p) => s + p.estimatedRevenueLossUSD, 0);
  }
}

class ExpansionSignalDetector {
  private signals: ExpansionSignalRecord[] = [];
  private counter = 0;

  detect(customerId: string, customerName: string, type: ExpansionSignalRecord['signalType'], strength: ExpansionSignalRecord['signalStrength'], opportunityUSD: number, evidence: string[], recommendedAction: string, recommendedProduct?: string): ExpansionSignalRecord {
    const signalId = `expsig-${Date.now()}-${++this.counter}`;
    const record: ExpansionSignalRecord = {
      signalId, customerId, customerName, signalType: type, signalStrength: strength,
      expansionOpportunityUSD: opportunityUSD, evidence, recommendedProduct, recommendedAction,
      expiryDate: Date.now() + 90 * 86400000,  // 90-day window
      isActioned: false, detectedAt: Date.now()
    };
    this.signals.push(record);
    logger.debug('Expansion signal detected', { signalId, customerId, type, strength, opportunityUSD });
    return record;
  }

  action(signalId: string): boolean {
    const sig = this.signals.find(s => s.signalId === signalId);
    if (!sig) return false;
    sig.isActioned = true;
    return true;
  }

  getActiveSignals(): ExpansionSignalRecord[] {
    const now = Date.now();
    return this.signals.filter(s => !s.isActioned && (!s.expiryDate || s.expiryDate > now))
      .sort((a, b) => b.expansionOpportunityUSD - a.expansionOpportunityUSD);
  }

  getTotalExpansionPipeline(): number {
    return this.getActiveSignals().reduce((s, sig) => s + sig.expansionOpportunityUSD, 0);
  }
}

class LifecycleStageManager {
  private stages: Map<string, LifecycleStageRecord> = new Map();
  private counter = 0;

  setStage(customerId: string, customerName: string, stage: LifecycleStageRecord['currentStage'], healthScore: number, nextMilestone: string, daysToMilestone: number, csm?: string): LifecycleStageRecord {
    const stageId = `lifecycle-${Date.now()}-${++this.counter}`;
    const existing = this.stages.get(customerId);
    const record: LifecycleStageRecord = {
      stageId, customerId, customerName, currentStage: stage,
      previousStage: existing?.currentStage,
      stageEnteredAt: existing?.currentStage === stage ? (existing?.stageEnteredAt || Date.now()) : Date.now(),
      daysInStage: existing?.currentStage === stage ? Math.floor((Date.now() - (existing?.stageEnteredAt || Date.now())) / 86400000) : 0,
      stageHealthScore: healthScore, nextMilestone, daysToNextMilestone: daysToMilestone,
      isOnTrack: daysToMilestone >= 0, csm,
      nextActionDue: Date.now() + Math.max(1, daysToMilestone) * 86400000,
      updatedAt: Date.now()
    };
    this.stages.set(customerId, record);
    return record;
  }

  getByStage(stage: LifecycleStageRecord['currentStage']): LifecycleStageRecord[] {
    return Array.from(this.stages.values()).filter(s => s.currentStage === stage);
  }

  getOffTrack(): LifecycleStageRecord[] {
    return Array.from(this.stages.values()).filter(s => !s.isOnTrack);
  }

  getAll(): LifecycleStageRecord[] {
    return Array.from(this.stages.values());
  }
}

export const customerHealthEngine = new CustomerHealthEngine();
export const churnPredictor = new ChurnPredictor();
export const expansionSignalDetector = new ExpansionSignalDetector();
export const lifecycleStageManager = new LifecycleStageManager();

export { CustomerHealthRecord, ChurnPredictionRecord, ExpansionSignalRecord, LifecycleStageRecord };
