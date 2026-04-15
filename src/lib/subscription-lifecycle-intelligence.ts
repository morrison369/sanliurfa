/**
 * Phase 273: Subscription Lifecycle Intelligence
 * Subscription health, expansion revenue, contraction analysis, renewal prediction
 */

import { logger } from './logger';

interface SubscriptionHealthRecord {
  healthId: string;
  subscriptionId: string;
  customerId: string;
  plan: string;
  mrr: number;                  // monthly recurring revenue
  daysUntilRenewal: number;
  featureAdoptionPct: number;   // % of licensed features actively used
  loginFrequencyPerMonth: number;
  supportTicketsLast90Days: number;
  paymentHealthScore: number;   // 0-100 (payment on time, no failed charges)
  overallHealthScore: number;   // composite 0-100
  healthBand: 'healthy' | 'neutral' | 'at_risk';
  calculatedAt: number;
}

interface ExpansionRevenueOpportunity {
  opportunityId: string;
  subscriptionId: string;
  customerId: string;
  currentMRR: number;
  opportunityType: 'upsell' | 'cross_sell' | 'seat_expansion' | 'usage_upgrade';
  targetPlan?: string;
  additionalMRR: number;
  probability: number;          // 0-100
  dueDate: number;
  signals: string[];            // usage signals driving opportunity
  status: 'identified' | 'engaged' | 'won' | 'lost';
  createdAt: number;
}

interface RenewalForecast {
  forecastId: string;
  period: string;               // renewal period, e.g. '2026-Q3'
  subscriptionsUpForRenewal: number;
  totalMRRAtRisk: number;
  forecastedRenewalRatePct: number;
  forecastedChurnMRR: number;
  forecastedExpansionMRR: number;
  netRevenueRetentionPct: number;   // (renewed + expansion) / original × 100
  confidence: 'high' | 'medium' | 'low';
  generatedAt: number;
}

interface ContractionRecord {
  contractionId: string;
  subscriptionId: string;
  customerId: string;
  previousMRR: number;
  newMRR: number;
  mrrLost: number;
  contractionReason: 'downgrade' | 'seat_reduction' | 'feature_removal' | 'negotiated_discount';
  occurredAt: number;
}

class SubscriptionHealthMonitor {
  private records: Map<string, SubscriptionHealthRecord[]> = new Map();
  private counter = 0;

  evaluate(subscriptionId: string, customerId: string, plan: string, mrr: number, daysUntilRenewal: number, featureAdoptionPct: number, loginFreq: number, supportTickets: number, paymentHealthScore: number): SubscriptionHealthRecord {
    const adoptionScore = featureAdoptionPct;
    const engagementScore = Math.min(100, loginFreq * 5);
    const supportScore = Math.max(0, 100 - supportTickets * 10);
    const urgencyDiscount = daysUntilRenewal < 30 ? 10 : 0;

    const overallHealthScore = Math.max(0, Math.min(100,
      adoptionScore * 0.3 + engagementScore * 0.25 + supportScore * 0.2 + paymentHealthScore * 0.25 - urgencyDiscount
    ));
    const healthBand: SubscriptionHealthRecord['healthBand'] =
      overallHealthScore >= 70 ? 'healthy' : overallHealthScore >= 40 ? 'neutral' : 'at_risk';

    const healthId = `subhealth-${Date.now()}-${++this.counter}`;
    const record: SubscriptionHealthRecord = {
      healthId, subscriptionId, customerId, plan, mrr, daysUntilRenewal,
      featureAdoptionPct, loginFrequencyPerMonth: loginFreq, supportTicketsLast90Days: supportTickets,
      paymentHealthScore, overallHealthScore, healthBand, calculatedAt: Date.now()
    };
    const history = this.records.get(subscriptionId) || [];
    history.push(record);
    this.records.set(subscriptionId, history);
    logger.debug('Subscription health evaluated', { subscriptionId, overallHealthScore, healthBand });
    return record;
  }

  getAtRisk(): SubscriptionHealthRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is SubscriptionHealthRecord => !!r && r.healthBand === 'at_risk')
      .sort((a, b) => b.mrr - a.mrr);
  }

  getTotalMRR(): number {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is SubscriptionHealthRecord => !!r)
      .reduce((s, r) => s + r.mrr, 0);
  }

  getLatest(subscriptionId: string): SubscriptionHealthRecord | undefined {
    const history = this.records.get(subscriptionId) || [];
    return history[history.length - 1];
  }
}

class ExpansionRevenueEngine {
  private opportunities: Map<string, ExpansionRevenueOpportunity> = new Map();
  private counter = 0;

  identify(subscriptionId: string, customerId: string, currentMRR: number, type: ExpansionRevenueOpportunity['opportunityType'], additionalMRR: number, probability: number, signals: string[]): ExpansionRevenueOpportunity {
    const opportunityId = `expansion-${Date.now()}-${++this.counter}`;
    const opportunity: ExpansionRevenueOpportunity = {
      opportunityId, subscriptionId, customerId, currentMRR, opportunityType: type,
      additionalMRR, probability, dueDate: Date.now() + 90 * 86400000, signals, status: 'identified', createdAt: Date.now()
    };
    this.opportunities.set(opportunityId, opportunity);
    return opportunity;
  }

  win(opportunityId: string): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;
    opp.status = 'won';
    return true;
  }

  getTotalPipelineMRR(): number {
    return Array.from(this.opportunities.values())
      .filter(o => o.status === 'identified' || o.status === 'engaged')
      .reduce((s, o) => s + o.additionalMRR * (o.probability / 100), 0);
  }

  getHighProbability(threshold = 70): ExpansionRevenueOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.probability >= threshold && o.status !== 'won' && o.status !== 'lost')
      .sort((a, b) => b.additionalMRR - a.additionalMRR);
  }
}

class RenewalForecastEngine {
  private forecasts: RenewalForecast[] = [];
  private counter = 0;

  forecast(period: string, subscriptions: number, totalMRRAtRisk: number, historicalRenewalRatePct: number, expectedExpansionMRR: number, healthDistribution: { healthy: number; neutral: number; atRisk: number }): RenewalForecast {
    const total = healthDistribution.healthy + healthDistribution.neutral + healthDistribution.atRisk;
    const forecastedRenewalRatePct = total > 0
      ? (healthDistribution.healthy * 0.95 + healthDistribution.neutral * 0.75 + healthDistribution.atRisk * 0.35) / total * 100
      : historicalRenewalRatePct;

    const forecastedChurnMRR = totalMRRAtRisk * (1 - forecastedRenewalRatePct / 100);
    const renewedMRR = totalMRRAtRisk * (forecastedRenewalRatePct / 100);
    const netRevenueRetentionPct = totalMRRAtRisk > 0 ? ((renewedMRR + expectedExpansionMRR) / totalMRRAtRisk) * 100 : 0;
    const confidence: RenewalForecast['confidence'] =
      Math.abs(forecastedRenewalRatePct - historicalRenewalRatePct) < 5 ? 'high' :
      Math.abs(forecastedRenewalRatePct - historicalRenewalRatePct) < 15 ? 'medium' : 'low';

    const forecastId = `renewal-${Date.now()}-${++this.counter}`;
    const forecast: RenewalForecast = {
      forecastId, period, subscriptionsUpForRenewal: subscriptions, totalMRRAtRisk,
      forecastedRenewalRatePct, forecastedChurnMRR, forecastedExpansionMRR: expectedExpansionMRR,
      netRevenueRetentionPct, confidence, generatedAt: Date.now()
    };
    this.forecasts.push(forecast);
    return forecast;
  }

  getLatest(): RenewalForecast | undefined {
    return this.forecasts[this.forecasts.length - 1];
  }
}

class ContractionTracker {
  private contractions: ContractionRecord[] = [];
  private counter = 0;

  record(subscriptionId: string, customerId: string, previousMRR: number, newMRR: number, reason: ContractionRecord['contractionReason']): ContractionRecord {
    const contractionId = `contraction-${Date.now()}-${++this.counter}`;
    const record: ContractionRecord = {
      contractionId, subscriptionId, customerId, previousMRR, newMRR,
      mrrLost: previousMRR - newMRR, contractionReason: reason, occurredAt: Date.now()
    };
    this.contractions.push(record);
    logger.debug('Contraction recorded', { subscriptionId, mrrLost: record.mrrLost, reason });
    return record;
  }

  getTotalMRRLost(): number {
    return this.contractions.reduce((s, c) => s + c.mrrLost, 0);
  }

  getByReason(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const c of this.contractions) result[c.contractionReason] = (result[c.contractionReason] || 0) + c.mrrLost;
    return result;
  }

  getTopContractions(limit = 5): ContractionRecord[] {
    return [...this.contractions].sort((a, b) => b.mrrLost - a.mrrLost).slice(0, limit);
  }
}

export const subscriptionHealthMonitor = new SubscriptionHealthMonitor();
export const expansionRevenueEngine = new ExpansionRevenueEngine();
export const renewalForecastEngine = new RenewalForecastEngine();
export const contractionTracker = new ContractionTracker();

export { SubscriptionHealthRecord, ExpansionRevenueOpportunity, RenewalForecast, ContractionRecord };
