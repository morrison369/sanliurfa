/**
 * Phase 332: Supply Disruption Intelligence
 * Disruption detection, alternate sourcing, impact assessment, recovery planning
 */

import { logger } from './logger';

interface DisruptionRecord {
  disruptionId: string;
  disruptionType: 'supplier_failure' | 'logistics_delay' | 'natural_disaster' | 'geopolitical' | 'quality_issue' | 'capacity_shortage' | 'price_spike' | 'regulatory';
  affectedSupplierId: string;
  affectedSupplierName: string;
  affectedSkus: string[];
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  status: 'detected' | 'confirmed' | 'mitigating' | 'resolved';
  detectedAt: number;
  estimatedResolutionDate?: number;
  affectedRevenueUSD: number;
  affectedVolumeUnits: number;
  alternativeSuppliersAvailable: number;
  resilienceScore: number;          // 0-100 (higher = easier to recover)
  geographicRegion: string;
  rootCause: string;
  impactSummary: string;
  createdAt: number;
}

interface AlternateSourceRecord {
  sourceId: string;
  disruptionId: string;
  skuId: string;
  skuName: string;
  originalSupplierId: string;
  alternateSupplierId: string;
  alternateSupplierName: string;
  availableCapacityUnits: number;
  leadTimeDays: number;
  unitCostUSD: number;
  originalUnitCostUSD: number;
  costPremiumPct: number;
  qualityRating: number;           // 0-100
  riskScore: number;               // 0-100 (higher = riskier)
  feasibilityScore: number;        // 0-100
  estimatedOnboardingDays: number;
  status: 'identified' | 'evaluating' | 'approved' | 'active' | 'rejected';
  createdAt: number;
}

interface DisruptionImpactRecord {
  impactId: string;
  disruptionId: string;
  period: string;
  revenueAtRiskUSD: number;
  estimatedRevenueLossUSD: number;
  inventoryShortfallUnits: number;
  customerOrdersAtRisk: number;
  stockoutProbabilityPct: number;
  daysUntilStockout: number;
  supplyChainCostIncreaseUSD: number;
  mitigationCostUSD: number;
  netImpactUSD: number;
  contingencyReserveUSD: number;
  impactCategory: 'operational' | 'financial' | 'reputational' | 'strategic';
  calculatedAt: number;
}

interface RecoveryPlanRecord {
  planId: string;
  disruptionId: string;
  planName: string;
  strategy: 'alternate_supplier' | 'inventory_buffer' | 'demand_reduction' | 'substitute_product' | 'expedite_shipping' | 'combined';
  actions: { action: string; owner: string; deadline: number; status: 'pending' | 'in_progress' | 'complete' }[];
  estimatedRecoveryDays: number;
  estimatedCostUSD: number;
  mitigationEffectPct: number;      // % of impact mitigated
  residualImpactUSD: number;
  approvalStatus: 'draft' | 'approved' | 'active' | 'completed';
  approvedBy?: string;
  createdAt: number;
}

class DisruptionDetector {
  private disruptions: Map<string, DisruptionRecord> = new Map();
  private counter = 0;

  detect(type: DisruptionRecord['disruptionType'], supplierId: string, supplierName: string, affectedSkus: string[], severity: DisruptionRecord['severity'], affectedRevenue: number, affectedVolume: number, altSuppliers: number, region: string, rootCause: string): DisruptionRecord {
    const disruptionId = `disrupt-${Date.now()}-${++this.counter}`;
    const resilienceScore = Math.min(100, Math.round(altSuppliers * 20 + (severity === 'minor' ? 40 : severity === 'moderate' ? 20 : 0)));
    const impactSummary = `${severity} ${type} at ${supplierName} affecting ${affectedSkus.length} SKUs, $${Math.round(affectedRevenue / 1000)}K revenue at risk`;

    const record: DisruptionRecord = {
      disruptionId, disruptionType: type, affectedSupplierId: supplierId,
      affectedSupplierName: supplierName, affectedSkus, severity, status: 'detected',
      detectedAt: Date.now(), affectedRevenueUSD: affectedRevenue,
      affectedVolumeUnits: affectedVolume, alternativeSuppliersAvailable: altSuppliers,
      resilienceScore, geographicRegion: region, rootCause, impactSummary, createdAt: Date.now()
    };
    this.disruptions.set(disruptionId, record);
    logger.debug('Disruption detected', { disruptionId, type, severity, affectedRevenue });
    return record;
  }

  updateStatus(disruptionId: string, status: DisruptionRecord['status'], resolutionDate?: number): boolean {
    const d = this.disruptions.get(disruptionId);
    if (!d) return false;
    d.status = status;
    if (resolutionDate) d.estimatedResolutionDate = resolutionDate;
    return true;
  }

  getActive(): DisruptionRecord[] {
    return Array.from(this.disruptions.values()).filter(d => d.status !== 'resolved');
  }

  getCritical(): DisruptionRecord[] {
    return Array.from(this.disruptions.values()).filter(d => d.severity === 'critical' && d.status !== 'resolved');
  }

  getTotalRevenueAtRisk(): number {
    return this.getActive().reduce((s, d) => s + d.affectedRevenueUSD, 0);
  }

  getAll(): DisruptionRecord[] {
    return Array.from(this.disruptions.values());
  }
}

class AlternateSourceManager {
  private sources: AlternateSourceRecord[] = [];
  private counter = 0;

  identify(disruptionId: string, skuId: string, skuName: string, originalSupplierId: string, altSupplierId: string, altSupplierName: string, capacity: number, leadTime: number, altUnitCost: number, origUnitCost: number, qualityRating: number, onboardingDays: number): AlternateSourceRecord {
    const sourceId = `altsrc-${Date.now()}-${++this.counter}`;
    const costPremium = origUnitCost > 0 ? Math.round(((altUnitCost - origUnitCost) / origUnitCost) * 100 * 10) / 10 : 0;
    const riskScore = Math.min(100, Math.round((100 - qualityRating) * 0.4 + leadTime * 0.5 + costPremium * 0.1));
    const feasibilityScore = Math.max(0, Math.min(100, Math.round(qualityRating * 0.5 + (100 - riskScore) * 0.3 + Math.min(capacity / 100, 100) * 0.2)));

    const record: AlternateSourceRecord = {
      sourceId, disruptionId, skuId, skuName, originalSupplierId,
      alternateSupplierId: altSupplierId, alternateSupplierName: altSupplierName,
      availableCapacityUnits: capacity, leadTimeDays: leadTime,
      unitCostUSD: altUnitCost, originalUnitCostUSD: origUnitCost, costPremiumPct: costPremium,
      qualityRating, riskScore, feasibilityScore,
      estimatedOnboardingDays: onboardingDays, status: 'identified', createdAt: Date.now()
    };
    this.sources.push(record);
    logger.debug('Alternate source identified', { sourceId, altSupplierName, feasibilityScore });
    return record;
  }

  approve(sourceId: string): boolean {
    const src = this.sources.find(s => s.sourceId === sourceId);
    if (!src) return false;
    src.status = 'approved';
    return true;
  }

  getBestAlternates(disruptionId: string, limit = 3): AlternateSourceRecord[] {
    return this.sources
      .filter(s => s.disruptionId === disruptionId)
      .sort((a, b) => b.feasibilityScore - a.feasibilityScore)
      .slice(0, limit);
  }
}

class DisruptionImpactCalculator {
  private impacts: DisruptionImpactRecord[] = [];
  private counter = 0;

  calculate(disruptionId: string, period: string, revenueAtRisk: number, inventoryShortfall: number, ordersAtRisk: number, stockoutDays: number, costIncrease: number, mitigationCost: number, contingencyReserve: number): DisruptionImpactRecord {
    const impactId = `disimpact-${Date.now()}-${++this.counter}`;
    const stockoutProb = stockoutDays <= 7 ? 90 : stockoutDays <= 14 ? 60 : stockoutDays <= 30 ? 30 : 10;
    const revLoss = Math.round(revenueAtRisk * (stockoutProb / 100));
    const netImpact = revLoss + costIncrease + mitigationCost;
    const impactCategory: DisruptionImpactRecord['impactCategory'] =
      netImpact > 1000000 ? 'strategic' : netImpact > 100000 ? 'financial' : ordersAtRisk > 100 ? 'reputational' : 'operational';

    const record: DisruptionImpactRecord = {
      impactId, disruptionId, period, revenueAtRiskUSD: revenueAtRisk,
      estimatedRevenueLossUSD: revLoss, inventoryShortfallUnits: inventoryShortfall,
      customerOrdersAtRisk: ordersAtRisk, stockoutProbabilityPct: stockoutProb,
      daysUntilStockout: stockoutDays, supplyChainCostIncreaseUSD: costIncrease,
      mitigationCostUSD: mitigationCost, netImpactUSD: netImpact,
      contingencyReserveUSD: contingencyReserve, impactCategory, calculatedAt: Date.now()
    };
    this.impacts.push(record);
    return record;
  }

  getTotalNetImpact(): number {
    return this.impacts.reduce((s, i) => s + i.netImpactUSD, 0);
  }

  getHighImpact(): DisruptionImpactRecord[] {
    return this.impacts.filter(i => i.netImpactUSD > 100000);
  }
}

class RecoveryPlanManager {
  private plans: RecoveryPlanRecord[] = [];
  private counter = 0;

  create(disruptionId: string, planName: string, strategy: RecoveryPlanRecord['strategy'], actions: RecoveryPlanRecord['actions'], recoveryDays: number, costUSD: number, mitigationEffectPct: number, totalImpactUSD: number): RecoveryPlanRecord {
    const planId = `recplan-${Date.now()}-${++this.counter}`;
    const residualImpact = Math.round(totalImpactUSD * (1 - mitigationEffectPct / 100));
    const record: RecoveryPlanRecord = {
      planId, disruptionId, planName, strategy, actions,
      estimatedRecoveryDays: recoveryDays, estimatedCostUSD: costUSD,
      mitigationEffectPct, residualImpactUSD: residualImpact,
      approvalStatus: 'draft', createdAt: Date.now()
    };
    this.plans.push(record);
    logger.debug('Recovery plan created', { planId, strategy, recoveryDays, mitigationEffectPct });
    return record;
  }

  approve(planId: string, approver: string): boolean {
    const plan = this.plans.find(p => p.planId === planId);
    if (!plan) return false;
    plan.approvalStatus = 'approved';
    plan.approvedBy = approver;
    return true;
  }

  getActivePlans(): RecoveryPlanRecord[] {
    return this.plans.filter(p => p.approvalStatus === 'approved' || p.approvalStatus === 'active');
  }

  getPlan(id: string): RecoveryPlanRecord | undefined {
    return this.plans.find(p => p.planId === id);
  }
}

export const disruptionDetector = new DisruptionDetector();
export const alternateSourceManager = new AlternateSourceManager();
export const disruptionImpactCalculator = new DisruptionImpactCalculator();
export const recoveryPlanManager = new RecoveryPlanManager();

export { DisruptionRecord, AlternateSourceRecord, DisruptionImpactRecord, RecoveryPlanRecord };
