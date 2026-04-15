/**
 * Phase 253: Digital Transformation Intelligence
 * Transformation initiative tracking, digitization maturity, adoption velocity, ROI measurement
 */

import { logger } from './logger';

interface TransformationInitiative {
  initiativeId: string;
  name: string;
  domain: 'customer_experience' | 'operations' | 'business_model' | 'culture' | 'data_analytics' | 'automation';
  sponsor: string;
  budget: number;
  spentToDate: number;
  startDate: number;
  targetEndDate: number;
  phase: 'discovery' | 'design' | 'pilot' | 'scaling' | 'embedded';
  adoptionRatePct: number;
  realizedROI: number;    // actual return so far
  projectedROI: number;
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'cancelled';
  createdAt: number;
}

interface DigitizationMaturityScore {
  assessmentId: string;
  domain: string;
  strategyScore: number;      // 0-100
  technologyScore: number;    // 0-100
  processScore: number;       // 0-100
  peopleScore: number;        // 0-100
  dataScore: number;          // 0-100
  overallMaturity: number;    // weighted composite
  maturityLevel: 1 | 2 | 3 | 4 | 5;  // 1=Initial, 5=Optimized
  assessedAt: number;
}

interface AdoptionVelocityMetric {
  metricId: string;
  initiativeId: string;
  week: string;
  newAdopters: number;
  totalAdopters: number;
  churnedAdopters: number;
  activeUsagePct: number;
  supportTickets: number;
  netAdoptionVelocity: number;  // newAdopters - churnedAdopters
  recordedAt: number;
}

interface TransformationROIReport {
  reportId: string;
  period: string;
  totalInvestment: number;
  totalBenefits: number;
  roi: number;              // (benefits - investment) / investment × 100
  paybackMonths: number;
  costSavings: number;
  revenueImpact: number;
  productivityGains: number;
  generatedAt: number;
}

class TransformationInitiativeTracker {
  private initiatives: Map<string, TransformationInitiative> = new Map();
  private counter = 0;

  create(name: string, domain: TransformationInitiative['domain'], sponsor: string, budget: number, targetEndDate: number, projectedROI: number): TransformationInitiative {
    const initiativeId = `transform-${Date.now()}-${++this.counter}`;
    const initiative: TransformationInitiative = {
      initiativeId, name, domain, sponsor, budget, spentToDate: 0,
      startDate: Date.now(), targetEndDate, phase: 'discovery', adoptionRatePct: 0,
      realizedROI: 0, projectedROI, status: 'on_track', createdAt: Date.now()
    };
    this.initiatives.set(initiativeId, initiative);
    logger.debug('Transformation initiative created', { initiativeId, name, domain });
    return initiative;
  }

  updateProgress(initiativeId: string, phase: TransformationInitiative['phase'], adoptionRate: number, spentToDate: number, realizedROI: number): boolean {
    const init = this.initiatives.get(initiativeId);
    if (!init) return false;
    init.phase = phase;
    init.adoptionRatePct = adoptionRate;
    init.spentToDate = spentToDate;
    init.realizedROI = realizedROI;
    const budgetUsedPct = init.budget > 0 ? spentToDate / init.budget * 100 : 0;
    const timeElapsedPct = ((Date.now() - init.startDate) / (init.targetEndDate - init.startDate)) * 100;
    init.status = budgetUsedPct > timeElapsedPct + 20 ? 'at_risk' : Date.now() > init.targetEndDate ? 'delayed' : 'on_track';
    return true;
  }

  getAtRisk(): TransformationInitiative[] {
    return Array.from(this.initiatives.values())
      .filter(i => i.status === 'at_risk' || i.status === 'delayed');
  }

  getTotalBudget(): number {
    return Array.from(this.initiatives.values()).reduce((s, i) => s + i.budget, 0);
  }

  getInitiative(id: string): TransformationInitiative | undefined {
    return this.initiatives.get(id);
  }

  getAllInitiatives(): TransformationInitiative[] {
    return Array.from(this.initiatives.values());
  }
}

class DigitizationMaturityAssessor {
  private assessments: Map<string, DigitizationMaturityScore[]> = new Map();
  private counter = 0;

  assess(domain: string, strategy: number, technology: number, process: number, people: number, data: number): DigitizationMaturityScore {
    const overall = strategy * 0.2 + technology * 0.25 + process * 0.2 + people * 0.2 + data * 0.15;
    const maturityLevel: DigitizationMaturityScore['maturityLevel'] =
      overall >= 80 ? 5 : overall >= 65 ? 4 : overall >= 50 ? 3 : overall >= 30 ? 2 : 1;

    const assessmentId = `digmat-${Date.now()}-${++this.counter}`;
    const score: DigitizationMaturityScore = {
      assessmentId, domain, strategyScore: Math.max(0, Math.min(100, strategy)),
      technologyScore: Math.max(0, Math.min(100, technology)),
      processScore: Math.max(0, Math.min(100, process)),
      peopleScore: Math.max(0, Math.min(100, people)),
      dataScore: Math.max(0, Math.min(100, data)),
      overallMaturity: Math.max(0, Math.min(100, overall)), maturityLevel, assessedAt: Date.now()
    };
    const history = this.assessments.get(domain) || [];
    history.push(score);
    this.assessments.set(domain, history);
    return score;
  }

  getLatest(domain: string): DigitizationMaturityScore | undefined {
    const history = this.assessments.get(domain) || [];
    return history[history.length - 1];
  }

  getLowMaturityDomains(maxLevel: DigitizationMaturityScore['maturityLevel'] = 2): DigitizationMaturityScore[] {
    return Array.from(this.assessments.values())
      .map(h => h[h.length - 1])
      .filter((s): s is DigitizationMaturityScore => !!s && s.maturityLevel <= maxLevel)
      .sort((a, b) => a.overallMaturity - b.overallMaturity);
  }
}

class AdoptionVelocityTracker {
  private metrics: Map<string, AdoptionVelocityMetric[]> = new Map();
  private counter = 0;

  record(initiativeId: string, week: string, newAdopters: number, totalAdopters: number, churnedAdopters: number, activeUsagePct: number, supportTickets: number): AdoptionVelocityMetric {
    const metricId = `adoptvel-${Date.now()}-${++this.counter}`;
    const metric: AdoptionVelocityMetric = {
      metricId, initiativeId, week, newAdopters, totalAdopters, churnedAdopters,
      activeUsagePct, supportTickets, netAdoptionVelocity: newAdopters - churnedAdopters, recordedAt: Date.now()
    };
    const existing = this.metrics.get(initiativeId) || [];
    existing.push(metric);
    this.metrics.set(initiativeId, existing);
    return metric;
  }

  getVelocityTrend(initiativeId: string): 'accelerating' | 'stable' | 'decelerating' {
    const history = this.metrics.get(initiativeId) || [];
    if (history.length < 2) return 'stable';
    const diff = history[history.length - 1].netAdoptionVelocity - history[history.length - 2].netAdoptionVelocity;
    return diff > 5 ? 'accelerating' : diff < -5 ? 'decelerating' : 'stable';
  }

  getLatest(initiativeId: string): AdoptionVelocityMetric | undefined {
    const history = this.metrics.get(initiativeId) || [];
    return history[history.length - 1];
  }
}

class TransformationROICalculator {
  private reports: TransformationROIReport[] = [];
  private counter = 0;

  calculate(period: string, totalInvestment: number, costSavings: number, revenueImpact: number, productivityGains: number): TransformationROIReport {
    const totalBenefits = costSavings + revenueImpact + productivityGains;
    const roi = totalInvestment > 0 ? ((totalBenefits - totalInvestment) / totalInvestment) * 100 : 0;
    const monthlyBenefit = totalBenefits / 12;
    const paybackMonths = monthlyBenefit > 0 ? totalInvestment / monthlyBenefit : Infinity;

    const reportId = `transROI-${Date.now()}-${++this.counter}`;
    const report: TransformationROIReport = {
      reportId, period, totalInvestment, totalBenefits, roi,
      paybackMonths: Math.round(paybackMonths), costSavings, revenueImpact, productivityGains, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): TransformationROIReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

export const transformationInitiativeTracker = new TransformationInitiativeTracker();
export const digitizationMaturityAssessor = new DigitizationMaturityAssessor();
export const adoptionVelocityTracker = new AdoptionVelocityTracker();
export const transformationROICalculator = new TransformationROICalculator();

export { TransformationInitiative, DigitizationMaturityScore, AdoptionVelocityMetric, TransformationROIReport };
