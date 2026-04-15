/**
 * Phase 259: Product Lifecycle Intelligence
 * Product stage tracking, sunset planning, version EOL management, adoption lifecycle curves
 */

import { logger } from './logger';

interface ProductLifecycleStage {
  stageId: string;
  productId: string;
  productName: string;
  currentStage: 'introduction' | 'growth' | 'maturity' | 'decline' | 'end_of_life';
  revenueGrowthRatePct: number;
  marketSharePct: number;
  activeUserCount: number;
  churnRatePct: number;
  investmentLevel: 'high' | 'medium' | 'low' | 'minimal';
  recommendedStrategy: string;
  enteredStageAt: number;
  updatedAt: number;
}

interface VersionEOLPlan {
  planId: string;
  productId: string;
  version: string;
  announcementDate: number;
  supportEndDate: number;    // security patches only
  eolDate: number;           // full end of life
  activeUsers: number;
  migrationTargetVersion: string;
  migrationReadiness: number;  // % of users migrated
  communicationSent: boolean;
  status: 'planned' | 'announced' | 'in_migration' | 'completed';
  createdAt: number;
}

interface AdoptionCurvePoint {
  pointId: string;
  productId: string;
  period: string;
  totalAddressableMarket: number;
  adoptedCount: number;
  adoptionPct: number;
  innovatorsPct: number;    // first ~2.5%
  earlyAdoptersPct: number; // next ~13.5%
  earlyMajorityPct: number; // next ~34%
  lateMajorityPct: number;  // next ~34%
  laggardsPct: number;      // last ~16%
  recordedAt: number;
}

interface ProductSunsetRecommendation {
  recommendationId: string;
  productId: string;
  productName: string;
  sunsetRationale: string[];
  estimatedCostSavings: number;
  proposedSunsetDate: number;
  affectedUsers: number;
  migrationPath: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'proposed' | 'approved' | 'rejected' | 'executing';
  createdAt: number;
}

class ProductLifecycleTracker {
  private stages: Map<string, ProductLifecycleStage[]> = new Map();
  private counter = 0;

  record(productId: string, productName: string, currentStage: ProductLifecycleStage['currentStage'], revenueGrowthRate: number, marketShare: number, activeUsers: number, churnRate: number): ProductLifecycleStage {
    const investmentLevel: ProductLifecycleStage['investmentLevel'] =
      currentStage === 'introduction' || currentStage === 'growth' ? 'high' :
      currentStage === 'maturity' ? 'medium' :
      currentStage === 'decline' ? 'low' : 'minimal';

    const recommendedStrategy =
      currentStage === 'introduction' ? 'Invest heavily in awareness and user acquisition' :
      currentStage === 'growth' ? 'Scale distribution and defend market share' :
      currentStage === 'maturity' ? 'Optimize profitability and extend lifecycle' :
      currentStage === 'decline' ? 'Harvest or pivot, reduce investment' :
      'Plan sunset, migrate users to replacement';

    const stageId = `plcstage-${Date.now()}-${++this.counter}`;
    const stage: ProductLifecycleStage = {
      stageId, productId, productName, currentStage, revenueGrowthRatePct: revenueGrowthRate,
      marketSharePct: marketShare, activeUserCount: activeUsers, churnRatePct: churnRate,
      investmentLevel, recommendedStrategy, enteredStageAt: Date.now(), updatedAt: Date.now()
    };
    const history = this.stages.get(productId) || [];
    history.push(stage);
    this.stages.set(productId, history);
    logger.debug('Product lifecycle stage recorded', { productId, currentStage });
    return stage;
  }

  getDeclineProducts(): ProductLifecycleStage[] {
    return Array.from(this.stages.values())
      .map(h => h[h.length - 1])
      .filter((s): s is ProductLifecycleStage => !!s && (s.currentStage === 'decline' || s.currentStage === 'end_of_life'))
      .sort((a, b) => b.activeUserCount - a.activeUserCount);
  }

  getLatest(productId: string): ProductLifecycleStage | undefined {
    const history = this.stages.get(productId) || [];
    return history[history.length - 1];
  }

  getStageDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const history of this.stages.values()) {
      const latest = history[history.length - 1];
      if (latest) dist[latest.currentStage] = (dist[latest.currentStage] || 0) + 1;
    }
    return dist;
  }
}

class VersionEOLManager {
  private plans: Map<string, VersionEOLPlan> = new Map();
  private counter = 0;

  plan(productId: string, version: string, supportEndDate: number, eolDate: number, activeUsers: number, migrationTarget: string): VersionEOLPlan {
    const planId = `eolplan-${Date.now()}-${++this.counter}`;
    const plan: VersionEOLPlan = {
      planId, productId, version, announcementDate: Date.now(), supportEndDate, eolDate,
      activeUsers, migrationTargetVersion: migrationTarget, migrationReadiness: 0,
      communicationSent: false, status: 'planned', createdAt: Date.now()
    };
    this.plans.set(planId, plan);
    return plan;
  }

  updateMigration(planId: string, migrationReadiness: number): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    plan.migrationReadiness = Math.max(0, Math.min(100, migrationReadiness));
    plan.status = migrationReadiness >= 100 ? 'completed' : 'in_migration';
    return true;
  }

  getUpcomingEOL(days = 180): VersionEOLPlan[] {
    const horizon = Date.now() + days * 86400 * 1000;
    return Array.from(this.plans.values())
      .filter(p => p.eolDate <= horizon && p.status !== 'completed')
      .sort((a, b) => a.eolDate - b.eolDate);
  }

  getLowMigrationReadiness(threshold = 50): VersionEOLPlan[] {
    return Array.from(this.plans.values())
      .filter(p => p.migrationReadiness < threshold && p.status !== 'completed');
  }
}

class AdoptionCurveAnalyzer {
  private points: Map<string, AdoptionCurvePoint[]> = new Map();
  private counter = 0;

  record(productId: string, period: string, tam: number, adopted: number): AdoptionCurvePoint {
    const adoptionPct = tam > 0 ? (adopted / tam) * 100 : 0;
    // Estimate segment distribution based on adoption %
    const innovatorsPct = Math.min(adoptionPct, 2.5);
    const earlyAdoptersPct = Math.min(Math.max(0, adoptionPct - 2.5), 13.5);
    const earlyMajorityPct = Math.min(Math.max(0, adoptionPct - 16), 34);
    const lateMajorityPct = Math.min(Math.max(0, adoptionPct - 50), 34);
    const laggardsPct = Math.max(0, adoptionPct - 84);

    const pointId = `adoptioncurve-${Date.now()}-${++this.counter}`;
    const point: AdoptionCurvePoint = {
      pointId, productId, period, totalAddressableMarket: tam, adoptedCount: adopted,
      adoptionPct, innovatorsPct, earlyAdoptersPct, earlyMajorityPct, lateMajorityPct, laggardsPct,
      recordedAt: Date.now()
    };
    const history = this.points.get(productId) || [];
    history.push(point);
    this.points.set(productId, history);
    return point;
  }

  getGrowthAcceleration(productId: string): number {
    const history = this.points.get(productId) || [];
    if (history.length < 2) return 0;
    const prev = history[history.length - 2].adoptionPct;
    const curr = history[history.length - 1].adoptionPct;
    return curr - prev;
  }

  getLatest(productId: string): AdoptionCurvePoint | undefined {
    const history = this.points.get(productId) || [];
    return history[history.length - 1];
  }
}

class ProductSunsetAdvisor {
  private recommendations: Map<string, ProductSunsetRecommendation> = new Map();
  private counter = 0;

  recommend(productId: string, productName: string, rationale: string[], costSavings: number, proposedDate: number, affectedUsers: number, migrationPath: string): ProductSunsetRecommendation {
    const riskLevel: ProductSunsetRecommendation['riskLevel'] =
      affectedUsers > 10000 ? 'high' : affectedUsers > 1000 ? 'medium' : 'low';

    const recommendationId = `sunsetrec-${Date.now()}-${++this.counter}`;
    const rec: ProductSunsetRecommendation = {
      recommendationId, productId, productName, sunsetRationale: rationale,
      estimatedCostSavings: costSavings, proposedSunsetDate: proposedDate,
      affectedUsers, migrationPath, riskLevel, status: 'proposed', createdAt: Date.now()
    };
    this.recommendations.set(productId, rec);
    logger.debug('Product sunset recommendation created', { productId, riskLevel, affectedUsers });
    return rec;
  }

  approve(productId: string): boolean {
    const rec = this.recommendations.get(productId);
    if (!rec) return false;
    rec.status = 'approved';
    return true;
  }

  getApproved(): ProductSunsetRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.status === 'approved');
  }

  getTotalCostSavings(): number {
    return Array.from(this.recommendations.values())
      .filter(r => r.status === 'approved' || r.status === 'executing')
      .reduce((s, r) => s + r.estimatedCostSavings, 0);
  }
}

export const productLifecycleTracker = new ProductLifecycleTracker();
export const versionEOLManager = new VersionEOLManager();
export const adoptionCurveAnalyzer = new AdoptionCurveAnalyzer();
export const productSunsetAdvisor = new ProductSunsetAdvisor();

export { ProductLifecycleStage, VersionEOLPlan, AdoptionCurvePoint, ProductSunsetRecommendation };
