/**
 * Phase 195: CLV Optimization
 * Customer Lifetime Value calculation, segmentation, retention ROI, lifetime value maximization
 */

import { logger } from './logger';

interface CustomerValueProfile {
  customerId: string;
  historicalRevenue: number;
  avgMonthlyRevenue: number;
  monthsActive: number;
  churnProbability: number; // 0-1
  predictedLTV: number;
  segment: 'champions' | 'loyal' | 'at_risk' | 'lost' | 'promising' | 'hibernating';
  lastUpdated: number;
}

interface RetentionIntervention {
  interventionId: string;
  customerId: string;
  type: 'discount_offer' | 'success_checkin' | 'feature_unlock' | 'loyalty_reward' | 'dedicated_support';
  cost: number;
  expectedRevenueRetained: number;
  roi: number;
  status: 'planned' | 'executed' | 'successful' | 'failed';
  createdAt: number;
}

interface CLVSegment {
  segmentId: string;
  name: string;
  criteria: { minLTV: number; maxLTV: number; minChurnProb: number; maxChurnProb: number };
  customerCount: number;
  avgLTV: number;
  totalLTV: number;
}

interface ValueMaximizationPlan {
  planId: string;
  customerId: string;
  currentLTV: number;
  targetLTV: number;
  actions: Array<{ action: string; expectedImpact: number; priority: number }>;
  createdAt: number;
}

class CLVCalculator {
  private profiles: Map<string, CustomerValueProfile> = new Map();

  upsert(customerId: string, historicalRevenue: number, avgMonthlyRevenue: number, monthsActive: number, churnProbability: number): CustomerValueProfile {
    const retentionRate = 1 - Math.max(0, Math.min(1, churnProbability));
    const avgDiscount = 0.1; // 10% discount rate
    const predictedLTV = retentionRate > 0 && retentionRate < 1
      ? historicalRevenue + (avgMonthlyRevenue * retentionRate) / (1 - retentionRate + avgDiscount / 12)
      : historicalRevenue + avgMonthlyRevenue * 24;

    const segment = this._assignSegment(avgMonthlyRevenue, churnProbability, monthsActive);
    const profile: CustomerValueProfile = {
      customerId, historicalRevenue, avgMonthlyRevenue, monthsActive,
      churnProbability, predictedLTV, segment, lastUpdated: Date.now()
    };
    this.profiles.set(customerId, profile);
    return profile;
  }

  private _assignSegment(avgMRR: number, churnProb: number, months: number): CustomerValueProfile['segment'] {
    if (avgMRR > 500 && churnProb < 0.2) return 'champions';
    if (avgMRR > 200 && churnProb < 0.3) return 'loyal';
    if (churnProb > 0.6) return months < 3 ? 'lost' : 'at_risk';
    if (months < 3 && avgMRR > 100) return 'promising';
    return 'hibernating';
  }

  getProfile(customerId: string): CustomerValueProfile | undefined {
    return this.profiles.get(customerId);
  }

  getPortfolioLTV(): number {
    return Array.from(this.profiles.values()).reduce((s, p) => s + p.predictedLTV, 0);
  }

  getTopCustomers(limit = 10): CustomerValueProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.predictedLTV - a.predictedLTV)
      .slice(0, limit);
  }
}

class CustomerSegmentOptimizer {
  private segments: Map<string, CLVSegment> = new Map();
  private counter = 0;

  defineSegment(name: string, minLTV: number, maxLTV: number, minChurnProb: number, maxChurnProb: number): CLVSegment {
    const segmentId = `segment-${Date.now()}-${++this.counter}`;
    const segment: CLVSegment = {
      segmentId, name,
      criteria: { minLTV, maxLTV, minChurnProb, maxChurnProb },
      customerCount: 0, avgLTV: 0, totalLTV: 0
    };
    this.segments.set(name, segment);
    return segment;
  }

  assignCustomers(profiles: CustomerValueProfile[]): Map<string, string[]> {
    const assignments = new Map<string, string[]>();
    for (const profile of profiles) {
      for (const [name, segment] of this.segments.entries()) {
        const { minLTV, maxLTV, minChurnProb, maxChurnProb } = segment.criteria;
        if (profile.predictedLTV >= minLTV && profile.predictedLTV <= maxLTV &&
          profile.churnProbability >= minChurnProb && profile.churnProbability <= maxChurnProb) {
          const list = assignments.get(name) || [];
          list.push(profile.customerId);
          assignments.set(name, list);
          break;
        }
      }
    }
    for (const [name, customerIds] of assignments.entries()) {
      const seg = this.segments.get(name);
      if (seg && profiles.length) {
        const segProfiles = profiles.filter(p => customerIds.includes(p.customerId));
        seg.customerCount = customerIds.length;
        seg.totalLTV = segProfiles.reduce((s, p) => s + p.predictedLTV, 0);
        seg.avgLTV = seg.customerCount > 0 ? seg.totalLTV / seg.customerCount : 0;
      }
    }
    return assignments;
  }

  getSegment(name: string): CLVSegment | undefined {
    return this.segments.get(name);
  }

  getSegments(): CLVSegment[] {
    return Array.from(this.segments.values());
  }
}

class RetentionROIAnalyzer {
  private interventions: Map<string, RetentionIntervention> = new Map();
  private counter = 0;

  plan(customerId: string, type: RetentionIntervention['type'], cost: number, expectedRevenueRetained: number): RetentionIntervention {
    const interventionId = `intervention-${Date.now()}-${++this.counter}`;
    const roi = cost > 0 ? ((expectedRevenueRetained - cost) / cost) * 100 : 0;
    const intervention: RetentionIntervention = {
      interventionId, customerId, type, cost, expectedRevenueRetained, roi,
      status: 'planned', createdAt: Date.now()
    };
    this.interventions.set(interventionId, intervention);
    logger.debug('Retention intervention planned', { interventionId, customerId, type, roi: roi.toFixed(1) });
    return intervention;
  }

  execute(interventionId: string): boolean {
    const i = this.interventions.get(interventionId);
    if (i && i.status === 'planned') { i.status = 'executed'; return true; }
    return false;
  }

  markOutcome(interventionId: string, successful: boolean): boolean {
    const i = this.interventions.get(interventionId);
    if (i && i.status === 'executed') { i.status = successful ? 'successful' : 'failed'; return true; }
    return false;
  }

  getAverageROI(): number {
    const completed = Array.from(this.interventions.values()).filter(i => i.status === 'successful' || i.status === 'failed');
    if (!completed.length) return 0;
    return completed.reduce((s, i) => s + i.roi, 0) / completed.length;
  }

  getRecommendedType(currentLTV: number): RetentionIntervention['type'] {
    if (currentLTV > 10000) return 'dedicated_support';
    if (currentLTV > 5000) return 'success_checkin';
    if (currentLTV > 1000) return 'feature_unlock';
    return 'discount_offer';
  }
}

class LifetimeValueMaximizer {
  private plans: Map<string, ValueMaximizationPlan> = new Map();
  private counter = 0;

  createPlan(customerId: string, currentLTV: number, targetLTV: number): ValueMaximizationPlan {
    const planId = `ltv-plan-${Date.now()}-${++this.counter}`;
    const gap = targetLTV - currentLTV;
    const actions: ValueMaximizationPlan['actions'] = [];

    if (gap > 5000) actions.push({ action: 'enterprise_upsell', expectedImpact: gap * 0.4, priority: 1 });
    if (gap > 1000) actions.push({ action: 'feature_adoption', expectedImpact: gap * 0.25, priority: 2 });
    actions.push({ action: 'reduce_churn_risk', expectedImpact: gap * 0.2, priority: 3 });
    actions.push({ action: 'cross_sell_products', expectedImpact: gap * 0.15, priority: 4 });

    const plan: ValueMaximizationPlan = {
      planId, customerId, currentLTV, targetLTV,
      actions: actions.sort((a, b) => a.priority - b.priority),
      createdAt: Date.now()
    };
    this.plans.set(planId, plan);
    logger.debug('LTV maximization plan created', { planId, customerId, currentLTV, targetLTV });
    return plan;
  }

  estimateMaxLTV(avgMonthlyRevenue: number, targetMonths = 36): number {
    return avgMonthlyRevenue * targetMonths * 1.3; // 30% expansion assumption
  }

  getPlan(planId: string): ValueMaximizationPlan | undefined {
    return this.plans.get(planId);
  }

  getPlansForCustomer(customerId: string): ValueMaximizationPlan[] {
    return Array.from(this.plans.values()).filter(p => p.customerId === customerId);
  }
}

export const clvCalculator = new CLVCalculator();
export const customerSegmentOptimizer = new CustomerSegmentOptimizer();
export const retentionROIAnalyzer = new RetentionROIAnalyzer();
export const lifetimeValueMaximizer = new LifetimeValueMaximizer();

export { CustomerValueProfile, RetentionIntervention, CLVSegment, ValueMaximizationPlan };
