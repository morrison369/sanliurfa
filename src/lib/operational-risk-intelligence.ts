/**
 * Phase 327: Operational Risk Intelligence
 * Risk registers, control effectiveness, loss events, risk appetite management
 */

import { logger } from './logger';

interface OperationalRiskRecord {
  riskId: string;
  riskTitle: string;
  category: 'process' | 'people' | 'systems' | 'external' | 'legal' | 'financial' | 'reputational';
  owner: string;
  department: string;
  description: string;
  likelihood: 1 | 2 | 3 | 4 | 5;   // 1=rare, 5=almost certain
  impact: 1 | 2 | 3 | 4 | 5;        // 1=negligible, 5=catastrophic
  inherentRiskScore: number;         // likelihood × impact (1-25)
  residualRiskScore: number;         // after controls
  riskRating: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
  mitigationActions: string[];
  targetResidualScore: number;
  reviewDate: number;
  isAppetiteBreached: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ControlRecord {
  controlId: string;
  controlName: string;
  controlType: 'preventive' | 'detective' | 'corrective' | 'compensating';
  riskIds: string[];
  owner: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  designEffectiveness: 'effective' | 'partially_effective' | 'ineffective';
  operatingEffectiveness: 'effective' | 'partially_effective' | 'ineffective';
  lastTestDate?: number;
  lastTestResult?: 'pass' | 'fail' | 'partial';
  overallEffectivenessScore: number;  // 0-100
  automationPct: number;
  isKeyControl: boolean;
  deficiencies: string[];
  createdAt: number;
}

interface LossEventRecord {
  lossId: string;
  riskId?: string;
  eventTitle: string;
  category: OperationalRiskRecord['category'];
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  directLossUSD: number;
  indirectLossUSD: number;
  totalLossUSD: number;
  recoveredUSD: number;
  netLossUSD: number;
  rootCause: string;
  contributingFactors: string[];
  controlsFailedIds: string[];
  lessonsLearned: string[];
  preventionRecommendations: string[];
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  occuredAt: number;
  resolvedAt?: number;
  reportedAt: number;
}

interface RiskAppetiteRecord {
  appetiteId: string;
  category: OperationalRiskRecord['category'];
  maxAcceptableScore: number;      // residual risk score threshold
  currentExposureScore: number;
  isBreached: boolean;
  breachCount: number;
  tolerance: 'zero_tolerance' | 'low' | 'medium' | 'high';
  statement: string;
  reviewedAt: number;
  approvedBy: string;
  createdAt: number;
}

class RiskRegister {
  private risks: Map<string, OperationalRiskRecord> = new Map();
  private counter = 0;

  register(title: string, category: OperationalRiskRecord['category'], owner: string, department: string, description: string, likelihood: OperationalRiskRecord['likelihood'], impact: OperationalRiskRecord['impact'], mitigationActions: string[], appetiteThreshold = 12): OperationalRiskRecord {
    const riskId = `risk-${Date.now()}-${++this.counter}`;
    const inherent = likelihood * impact;
    // Residual assumes mitigation reduces by ~30%
    const residual = Math.ceil(inherent * 0.7);
    const riskRating: OperationalRiskRecord['riskRating'] =
      residual >= 20 ? 'critical' : residual >= 12 ? 'high' : residual >= 6 ? 'medium' : 'low';

    const record: OperationalRiskRecord = {
      riskId, riskTitle: title, category, owner, department, description,
      likelihood, impact, inherentRiskScore: inherent, residualRiskScore: residual,
      riskRating, status: 'open', mitigationActions,
      targetResidualScore: Math.floor(inherent * 0.5),
      reviewDate: Date.now() + 90 * 86400000,
      isAppetiteBreached: residual > appetiteThreshold,
      createdAt: Date.now(), updatedAt: Date.now()
    };
    this.risks.set(riskId, record);
    logger.debug('Operational risk registered', { riskId, title, riskRating, inherent, residual });
    return record;
  }

  updateStatus(riskId: string, status: OperationalRiskRecord['status'], newResidualScore?: number): boolean {
    const risk = this.risks.get(riskId);
    if (!risk) return false;
    risk.status = status;
    if (newResidualScore !== undefined) {
      risk.residualRiskScore = newResidualScore;
      risk.riskRating = newResidualScore >= 20 ? 'critical' : newResidualScore >= 12 ? 'high' : newResidualScore >= 6 ? 'medium' : 'low';
    }
    risk.updatedAt = Date.now();
    return true;
  }

  getCriticalRisks(): OperationalRiskRecord[] {
    return Array.from(this.risks.values()).filter(r => r.riskRating === 'critical' && r.status !== 'closed');
  }

  getAppetiteBreaches(): OperationalRiskRecord[] {
    return Array.from(this.risks.values()).filter(r => r.isAppetiteBreached && r.status !== 'closed');
  }

  getRiskHeatmap(): { rating: string; count: number }[] {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    Array.from(this.risks.values()).filter(r => r.status !== 'closed').forEach(r => counts[r.riskRating]++);
    return Object.entries(counts).map(([rating, count]) => ({ rating, count }));
  }

  getAll(): OperationalRiskRecord[] {
    return Array.from(this.risks.values());
  }
}

class ControlEffectivenessTracker {
  private controls: Map<string, ControlRecord> = new Map();
  private counter = 0;

  register(name: string, type: ControlRecord['controlType'], riskIds: string[], owner: string, frequency: ControlRecord['frequency'], isKey: boolean, automationPct: number): ControlRecord {
    const controlId = `ctrl-${Date.now()}-${++this.counter}`;
    const record: ControlRecord = {
      controlId, controlName: name, controlType: type, riskIds, owner, frequency,
      designEffectiveness: 'effective', operatingEffectiveness: 'effective',
      overallEffectivenessScore: 80, automationPct,
      isKeyControl: isKey, deficiencies: [], createdAt: Date.now()
    };
    this.controls.set(controlId, record);
    return record;
  }

  recordTest(controlId: string, designEff: ControlRecord['designEffectiveness'], operatingEff: ControlRecord['operatingEffectiveness'], result: 'pass' | 'fail' | 'partial', deficiencies: string[]): boolean {
    const ctrl = this.controls.get(controlId);
    if (!ctrl) return false;
    ctrl.designEffectiveness = designEff;
    ctrl.operatingEffectiveness = operatingEff;
    ctrl.lastTestDate = Date.now();
    ctrl.lastTestResult = result;
    ctrl.deficiencies = deficiencies;
    const designScore = designEff === 'effective' ? 100 : designEff === 'partially_effective' ? 60 : 20;
    const opScore = operatingEff === 'effective' ? 100 : operatingEff === 'partially_effective' ? 60 : 20;
    ctrl.overallEffectivenessScore = Math.round((designScore + opScore) / 2);
    logger.debug('Control test recorded', { controlId, result, overallScore: ctrl.overallEffectivenessScore });
    return true;
  }

  getWeakControls(threshold = 60): ControlRecord[] {
    return Array.from(this.controls.values()).filter(c => c.overallEffectivenessScore < threshold);
  }

  getKeyControlsWithFailures(): ControlRecord[] {
    return Array.from(this.controls.values()).filter(c => c.isKeyControl && c.lastTestResult === 'fail');
  }

  getAll(): ControlRecord[] {
    return Array.from(this.controls.values());
  }
}

class LossEventTracker {
  private events: LossEventRecord[] = [];
  private counter = 0;

  record(title: string, category: OperationalRiskRecord['category'], directLoss: number, indirectLoss: number, recovered: number, rootCause: string, contributingFactors: string[], lessons: string[], riskId?: string): LossEventRecord {
    const lossId = `loss-${Date.now()}-${++this.counter}`;
    const total = directLoss + indirectLoss;
    const net = Math.max(0, total - recovered);
    const severity: LossEventRecord['severity'] =
      net >= 1000000 ? 'severe' : net >= 100000 ? 'major' : net >= 10000 ? 'moderate' : 'minor';

    const record: LossEventRecord = {
      lossId, riskId, eventTitle: title, category, severity,
      directLossUSD: directLoss, indirectLossUSD: indirectLoss,
      totalLossUSD: total, recoveredUSD: recovered, netLossUSD: net,
      rootCause, contributingFactors, controlsFailedIds: [],
      lessonsLearned: lessons,
      preventionRecommendations: lessons.map(l => `Implement: ${l}`),
      status: 'open', occuredAt: Date.now(), reportedAt: Date.now()
    };
    this.events.push(record);
    logger.debug('Loss event recorded', { lossId, severity, netLoss: net });
    return record;
  }

  getTotalNetLoss(): number {
    return this.events.reduce((s, e) => s + e.netLossUSD, 0);
  }

  getSevereLosses(): LossEventRecord[] {
    return this.events.filter(e => e.severity === 'severe' || e.severity === 'major');
  }

  getLossByCategory(): { category: string; totalLoss: number; count: number }[] {
    const map = new Map<string, { total: number; count: number }>();
    this.events.forEach(e => {
      const existing = map.get(e.category) || { total: 0, count: 0 };
      existing.total += e.netLossUSD;
      existing.count++;
      map.set(e.category, existing);
    });
    return Array.from(map.entries()).map(([category, data]) => ({ category, totalLoss: data.total, count: data.count }));
  }
}

class RiskAppetiteManager {
  private appetites: Map<string, RiskAppetiteRecord> = new Map();
  private counter = 0;

  define(category: OperationalRiskRecord['category'], maxScore: number, tolerance: RiskAppetiteRecord['tolerance'], statement: string, approvedBy: string): RiskAppetiteRecord {
    const appetiteId = `appetite-${Date.now()}-${++this.counter}`;
    const record: RiskAppetiteRecord = {
      appetiteId, category, maxAcceptableScore: maxScore, currentExposureScore: 0,
      isBreached: false, breachCount: 0, tolerance, statement,
      reviewedAt: Date.now(), approvedBy, createdAt: Date.now()
    };
    this.appetites.set(category, record);
    return record;
  }

  updateExposure(category: OperationalRiskRecord['category'], currentScore: number): boolean {
    const appetite = this.appetites.get(category);
    if (!appetite) return false;
    appetite.currentExposureScore = currentScore;
    const wasBreached = appetite.isBreached;
    appetite.isBreached = currentScore > appetite.maxAcceptableScore;
    if (appetite.isBreached && !wasBreached) appetite.breachCount++;
    return true;
  }

  getBreaches(): RiskAppetiteRecord[] {
    return Array.from(this.appetites.values()).filter(a => a.isBreached);
  }

  getAll(): RiskAppetiteRecord[] {
    return Array.from(this.appetites.values());
  }
}

export const riskRegister = new RiskRegister();
export const controlEffectivenessTracker = new ControlEffectivenessTracker();
export const lossEventTracker = new LossEventTracker();
export const riskAppetiteManager = new RiskAppetiteManager();

export { OperationalRiskRecord, ControlRecord, LossEventRecord, RiskAppetiteRecord };
