/**
 * Phase 232: Operational Risk Management
 * Risk identification, risk scoring, control effectiveness, loss event tracking
 */

import { logger } from './logger';

interface OperationalRisk {
  riskId: string;
  name: string;
  category: 'process' | 'people' | 'technology' | 'external' | 'legal' | 'financial';
  description: string;
  likelihood: number;      // 1-5
  impact: number;          // 1-5
  riskScore: number;       // likelihood * impact
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
  identifiedAt: number;
}

interface RiskControl {
  controlId: string;
  riskId: string;
  name: string;
  type: 'preventive' | 'detective' | 'corrective';
  effectiveness: 'highly_effective' | 'effective' | 'partially_effective' | 'ineffective';
  lastTestedAt: number;
  nextTestAt: number;
  residualRiskReductionPct: number;
  owner: string;
  createdAt: number;
}

interface LossEvent {
  lossId: string;
  riskId: string;
  description: string;
  financialImpact: number;
  operationalImpact: string;
  rootCause: string;
  controlFailures: string[];
  lessonLearned: string;
  preventionActions: string[];
  occurredAt: number;
  reportedAt: number;
}

interface RiskHeatmapEntry {
  entryId: string;
  riskId: string;
  likelihood: number;
  impact: number;
  quadrant: 'watch' | 'manage' | 'monitor' | 'critical';
  updatedAt: number;
}

class OperationalRiskRegister {
  private risks: Map<string, OperationalRisk> = new Map();
  private counter = 0;

  register(name: string, category: OperationalRisk['category'], description: string, likelihood: number, impact: number, owner: string): OperationalRisk {
    const riskScore = likelihood * impact;
    const riskLevel: OperationalRisk['riskLevel'] =
      riskScore >= 20 ? 'critical' :
      riskScore >= 12 ? 'high' :
      riskScore >= 6 ? 'medium' : 'low';
    const riskId = `oprisk-${Date.now()}-${++this.counter}`;
    const risk: OperationalRisk = {
      riskId, name, category, description,
      likelihood: Math.max(1, Math.min(5, likelihood)),
      impact: Math.max(1, Math.min(5, impact)),
      riskScore, riskLevel, owner, status: 'open', identifiedAt: Date.now()
    };
    this.risks.set(riskId, risk);
    logger.debug('Operational risk registered', { riskId, name, riskLevel, riskScore });
    return risk;
  }

  updateStatus(riskId: string, status: OperationalRisk['status']): boolean {
    const risk = this.risks.get(riskId);
    if (!risk) return false;
    risk.status = status;
    return true;
  }

  getByLevel(level: OperationalRisk['riskLevel']): OperationalRisk[] {
    return Array.from(this.risks.values()).filter(r => r.riskLevel === level && r.status === 'open');
  }

  getTopRisks(limit = 10): OperationalRisk[] {
    return Array.from(this.risks.values())
      .filter(r => r.status === 'open')
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  getRisk(riskId: string): OperationalRisk | undefined {
    return this.risks.get(riskId);
  }
}

class RiskControlManager {
  private controls: Map<string, RiskControl[]> = new Map();
  private counter = 0;

  add(riskId: string, name: string, type: RiskControl['type'], effectiveness: RiskControl['effectiveness'], residualReductionPct: number, owner: string): RiskControl {
    const controlId = `ctrl-${Date.now()}-${++this.counter}`;
    const control: RiskControl = {
      controlId, riskId, name, type, effectiveness,
      lastTestedAt: Date.now(), nextTestAt: Date.now() + 90 * 86400 * 1000,
      residualRiskReductionPct: Math.max(0, Math.min(100, residualReductionPct)),
      owner, createdAt: Date.now()
    };
    const existing = this.controls.get(riskId) || [];
    existing.push(control);
    this.controls.set(riskId, existing);
    return control;
  }

  getResidualRiskScore(riskId: string, originalScore: number): number {
    const controls = this.controls.get(riskId) || [];
    const effectiveControls = controls.filter(c => c.effectiveness !== 'ineffective');
    const totalReduction = effectiveControls.reduce((s, c) => s + c.residualRiskReductionPct, 0);
    return originalScore * Math.max(0, (1 - totalReduction / 100));
  }

  getWeakControls(): RiskControl[] {
    return Array.from(this.controls.values()).flat()
      .filter(c => c.effectiveness === 'partially_effective' || c.effectiveness === 'ineffective');
  }

  getControlsByRisk(riskId: string): RiskControl[] {
    return this.controls.get(riskId) || [];
  }
}

class LossEventTracker {
  private events: LossEvent[] = [];
  private counter = 0;

  record(riskId: string, description: string, financialImpact: number, operationalImpact: string, rootCause: string, controlFailures: string[], lessonLearned: string, preventionActions: string[]): LossEvent {
    const lossId = `loss-${Date.now()}-${++this.counter}`;
    const event: LossEvent = {
      lossId, riskId, description, financialImpact, operationalImpact,
      rootCause, controlFailures, lessonLearned, preventionActions,
      occurredAt: Date.now(), reportedAt: Date.now()
    };
    this.events.push(event);
    logger.debug('Loss event recorded', { lossId, riskId, financialImpact });
    return event;
  }

  getTotalFinancialLoss(): number {
    return this.events.reduce((s, e) => s + e.financialImpact, 0);
  }

  getEventsByRisk(riskId: string): LossEvent[] {
    return this.events.filter(e => e.riskId === riskId);
  }

  getTopLossCauses(limit = 5): Array<{ rootCause: string; totalLoss: number; count: number }> {
    const map = new Map<string, { totalLoss: number; count: number }>();
    for (const e of this.events) {
      const existing = map.get(e.rootCause) || { totalLoss: 0, count: 0 };
      existing.totalLoss += e.financialImpact;
      existing.count++;
      map.set(e.rootCause, existing);
    }
    return Array.from(map.entries())
      .map(([rootCause, stats]) => ({ rootCause, ...stats }))
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, limit);
  }
}

class RiskHeatmapGenerator {
  private entries: Map<string, RiskHeatmapEntry> = new Map();
  private counter = 0;

  place(riskId: string, likelihood: number, impact: number): RiskHeatmapEntry {
    const quadrant: RiskHeatmapEntry['quadrant'] =
      likelihood >= 4 && impact >= 4 ? 'critical' :
      likelihood >= 3 && impact >= 3 ? 'manage' :
      likelihood <= 2 && impact <= 2 ? 'monitor' : 'watch';
    const entryId = `heatmap-${Date.now()}-${++this.counter}`;
    const entry: RiskHeatmapEntry = {
      entryId, riskId, likelihood, impact, quadrant, updatedAt: Date.now()
    };
    this.entries.set(riskId, entry);
    return entry;
  }

  getCriticalQuadrant(): RiskHeatmapEntry[] {
    return Array.from(this.entries.values()).filter(e => e.quadrant === 'critical');
  }

  getByQuadrant(quadrant: RiskHeatmapEntry['quadrant']): RiskHeatmapEntry[] {
    return Array.from(this.entries.values()).filter(e => e.quadrant === quadrant);
  }

  getAllEntries(): RiskHeatmapEntry[] {
    return Array.from(this.entries.values());
  }
}

export const operationalRiskRegister = new OperationalRiskRegister();
export const riskControlManager = new RiskControlManager();
export const lossEventTracker = new LossEventTracker();
export const riskHeatmapGenerator = new RiskHeatmapGenerator();

export { OperationalRisk, RiskControl, LossEvent, RiskHeatmapEntry };
