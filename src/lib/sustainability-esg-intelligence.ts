/**
 * Phase 252: Sustainability & ESG Intelligence
 * Carbon tracking, ESG scoring, sustainability targets, regulatory compliance
 */

import { logger } from './logger';

interface CarbonEmissionRecord {
  recordId: string;
  scope: 'scope1' | 'scope2' | 'scope3';  // GHG protocol scopes
  source: string;
  category: 'energy' | 'transport' | 'supply_chain' | 'waste' | 'facilities';
  co2eTonnes: number;
  period: string;         // YYYY-MM
  department: string;
  intensity?: number;     // co2e per unit of output
  recordedAt: number;
}

interface ESGScore {
  scoreId: string;
  period: string;
  environmentScore: number;    // 0-100
  socialScore: number;         // 0-100
  governanceScore: number;     // 0-100
  overallESGScore: number;     // weighted composite
  rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  findings: string[];
  calculatedAt: number;
}

interface SustainabilityTarget {
  targetId: string;
  name: string;
  category: 'carbon' | 'water' | 'waste' | 'renewable_energy' | 'diversity' | 'supply_chain';
  targetYear: number;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  progressPct: number;
  onTrack: boolean;
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved';
  updatedAt: number;
}

interface ESGRegulatoryItem {
  itemId: string;
  regulation: string;   // e.g. 'CSRD', 'TCFD', 'SFDR', 'SEC Climate'
  jurisdiction: string;
  requirement: string;
  dueDate: number;
  complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  gapDescription?: string;
  remediationPlan?: string;
  createdAt: number;
}

class CarbonEmissionTracker {
  private emissions: CarbonEmissionRecord[] = [];
  private counter = 0;

  record(scope: CarbonEmissionRecord['scope'], source: string, category: CarbonEmissionRecord['category'], co2eTonnes: number, period: string, department: string, intensity?: number): CarbonEmissionRecord {
    const recordId = `carbon-${Date.now()}-${++this.counter}`;
    const record: CarbonEmissionRecord = {
      recordId, scope, source, category, co2eTonnes, period, department, intensity, recordedAt: Date.now()
    };
    this.emissions.push(record);
    logger.debug('Carbon emission recorded', { scope, co2eTonnes, period });
    return record;
  }

  getTotalByScope(period?: string): Record<string, number> {
    const filtered = period ? this.emissions.filter(e => e.period === period) : this.emissions;
    const result: Record<string, number> = { scope1: 0, scope2: 0, scope3: 0 };
    for (const e of filtered) result[e.scope] = (result[e.scope] || 0) + e.co2eTonnes;
    return result;
  }

  getTotalEmissions(period?: string): number {
    const byScope = this.getTotalByScope(period);
    return Object.values(byScope).reduce((s, v) => s + v, 0);
  }

  getTopEmitters(limit = 5): { source: string; total: number }[] {
    const bySource: Record<string, number> = {};
    for (const e of this.emissions) bySource[e.source] = (bySource[e.source] || 0) + e.co2eTonnes;
    return Object.entries(bySource)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  getPeriodTrend(periods: string[]): { period: string; total: number }[] {
    return periods.map(period => ({ period, total: this.getTotalEmissions(period) }));
  }
}

class ESGScorer {
  private scores: ESGScore[] = [];
  private counter = 0;

  calculate(period: string, environment: number, social: number, governance: number, findings: string[]): ESGScore {
    const overall = environment * 0.4 + social * 0.35 + governance * 0.25;
    const rating: ESGScore['rating'] =
      overall >= 90 ? 'AAA' : overall >= 80 ? 'AA' : overall >= 70 ? 'A' :
      overall >= 60 ? 'BBB' : overall >= 50 ? 'BB' : overall >= 35 ? 'B' : 'CCC';

    const scoreId = `esgscore-${Date.now()}-${++this.counter}`;
    const score: ESGScore = {
      scoreId, period,
      environmentScore: Math.max(0, Math.min(100, environment)),
      socialScore: Math.max(0, Math.min(100, social)),
      governanceScore: Math.max(0, Math.min(100, governance)),
      overallESGScore: Math.max(0, Math.min(100, overall)), rating, findings, calculatedAt: Date.now()
    };
    this.scores.push(score);
    return score;
  }

  getLatest(): ESGScore | undefined {
    return this.scores[this.scores.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.scores.length < 2) return 'stable';
    const diff = this.scores[this.scores.length - 1].overallESGScore - this.scores[this.scores.length - 2].overallESGScore;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }
}

class SustainabilityTargetManager {
  private targets: Map<string, SustainabilityTarget> = new Map();
  private counter = 0;

  set(name: string, category: SustainabilityTarget['category'], targetYear: number, baselineValue: number, targetValue: number): SustainabilityTarget {
    const targetId = `sustTarget-${Date.now()}-${++this.counter}`;
    const target: SustainabilityTarget = {
      targetId, name, category, targetYear, baselineValue, targetValue,
      currentValue: baselineValue, progressPct: 0, onTrack: true, status: 'on_track', updatedAt: Date.now()
    };
    this.targets.set(targetId, target);
    return target;
  }

  updateProgress(targetId: string, currentValue: number): boolean {
    const t = this.targets.get(targetId);
    if (!t) return false;
    t.currentValue = currentValue;
    const totalChange = t.baselineValue - t.targetValue;
    const achieved = t.baselineValue - currentValue;
    t.progressPct = totalChange !== 0 ? Math.max(0, Math.min(100, (achieved / totalChange) * 100)) : 0;
    if (t.progressPct >= 100) {
      t.status = 'achieved';
      t.onTrack = true;
    } else {
      t.onTrack = t.progressPct >= 50;
      t.status = t.progressPct >= 50 ? 'on_track' : t.progressPct >= 25 ? 'at_risk' : 'off_track';
    }
    t.updatedAt = Date.now();
    return true;
  }

  getOffTrack(): SustainabilityTarget[] {
    return Array.from(this.targets.values()).filter(t => t.status === 'off_track' || t.status === 'at_risk');
  }

  getTarget(targetId: string): SustainabilityTarget | undefined {
    return this.targets.get(targetId);
  }

  getAllTargets(): SustainabilityTarget[] {
    return Array.from(this.targets.values());
  }
}

class ESGComplianceTracker {
  private items: Map<string, ESGRegulatoryItem> = new Map();
  private counter = 0;

  register(regulation: string, jurisdiction: string, requirement: string, dueDate: number): ESGRegulatoryItem {
    const itemId = `esgcomp-${Date.now()}-${++this.counter}`;
    const item: ESGRegulatoryItem = {
      itemId, regulation, jurisdiction, requirement, dueDate,
      complianceStatus: 'non_compliant', createdAt: Date.now()
    };
    this.items.set(itemId, item);
    logger.debug('ESG regulatory item registered', { regulation, jurisdiction });
    return item;
  }

  updateStatus(itemId: string, status: ESGRegulatoryItem['complianceStatus'], gap?: string, plan?: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;
    item.complianceStatus = status;
    item.gapDescription = gap;
    item.remediationPlan = plan;
    return true;
  }

  getNonCompliant(): ESGRegulatoryItem[] {
    return Array.from(this.items.values())
      .filter(i => i.complianceStatus === 'non_compliant' || i.complianceStatus === 'partial')
      .sort((a, b) => a.dueDate - b.dueDate);
  }

  getComplianceRate(): number {
    const all = Array.from(this.items.values()).filter(i => i.complianceStatus !== 'not_applicable');
    if (!all.length) return 0;
    return (all.filter(i => i.complianceStatus === 'compliant').length / all.length) * 100;
  }
}

export const carbonEmissionTracker = new CarbonEmissionTracker();
export const esgScorer = new ESGScorer();
export const sustainabilityTargetManager = new SustainabilityTargetManager();
export const esgComplianceTracker = new ESGComplianceTracker();

export { CarbonEmissionRecord, ESGScore, SustainabilityTarget, ESGRegulatoryItem };
