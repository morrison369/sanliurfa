/**
 * Phase 224: Change Management Analytics
 * Change initiative tracking, adoption monitoring, resistance analysis, impact assessment
 */

import { logger } from './logger';

interface ChangeInitiative {
  initiativeId: string;
  name: string;
  description: string;
  type: 'technology' | 'process' | 'culture' | 'structure' | 'strategy';
  scope: 'department' | 'division' | 'enterprise';
  affectedEmployees: number;
  startDate: number;
  targetCompletionDate: number;
  status: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled';
  owner: string;
  createdAt: number;
}

interface ChangeAdoptionMetric {
  adoptionId: string;
  initiativeId: string;
  period: string;
  totalAffected: number;
  aware: number;
  trained: number;
  adopted: number;
  proficient: number;
  awarenessRate: number;
  adoptionRate: number;
  proficiencyRate: number;
  measuredAt: number;
}

interface ResistanceRecord {
  resistanceId: string;
  initiativeId: string;
  segment: string;
  resistanceLevel: 'low' | 'medium' | 'high' | 'critical';
  rootCauses: string[];
  affectedCount: number;
  mitigationActions: string[];
  resolvedAt?: number;
  recordedAt: number;
}

interface ChangeImpactAssessment {
  assessmentId: string;
  initiativeId: string;
  productivityImpact: number;   // -100 to +100
  moralImpact: number;          // -100 to +100
  operationalRisk: number;      // 0-100
  businessContinuityRisk: number; // 0-100
  overallChangeReadiness: number; // 0-100
  assessedAt: number;
}

class ChangeInitiativeTracker {
  private initiatives: Map<string, ChangeInitiative> = new Map();
  private counter = 0;

  create(name: string, description: string, type: ChangeInitiative['type'], scope: ChangeInitiative['scope'], affectedEmployees: number, owner: string, targetCompletionDate: number): ChangeInitiative {
    const initiativeId = `chginit-${Date.now()}-${++this.counter}`;
    const initiative: ChangeInitiative = {
      initiativeId, name, description, type, scope,
      affectedEmployees, startDate: Date.now(), targetCompletionDate,
      status: 'planning', owner, createdAt: Date.now()
    };
    this.initiatives.set(initiativeId, initiative);
    logger.debug('Change initiative created', { initiativeId, name, type, scope });
    return initiative;
  }

  updateStatus(initiativeId: string, status: ChangeInitiative['status']): boolean {
    const initiative = this.initiatives.get(initiativeId);
    if (!initiative) return false;
    initiative.status = status;
    return true;
  }

  getActive(): ChangeInitiative[] {
    return Array.from(this.initiatives.values()).filter(i => i.status === 'active');
  }

  getOverdue(): ChangeInitiative[] {
    const now = Date.now();
    return Array.from(this.initiatives.values())
      .filter(i => i.status !== 'completed' && i.status !== 'cancelled' && i.targetCompletionDate < now);
  }

  getInitiative(initiativeId: string): ChangeInitiative | undefined {
    return this.initiatives.get(initiativeId);
  }
}

class AdoptionMonitor {
  private metrics: Map<string, ChangeAdoptionMetric[]> = new Map();
  private counter = 0;

  record(initiativeId: string, period: string, total: number, aware: number, trained: number, adopted: number, proficient: number): ChangeAdoptionMetric {
    const adoptionId = `adopt-${Date.now()}-${++this.counter}`;
    const metric: ChangeAdoptionMetric = {
      adoptionId, initiativeId, period, totalAffected: total,
      aware, trained, adopted, proficient,
      awarenessRate: total > 0 ? (aware / total) * 100 : 0,
      adoptionRate: total > 0 ? (adopted / total) * 100 : 0,
      proficiencyRate: total > 0 ? (proficient / total) * 100 : 0,
      measuredAt: Date.now()
    };
    const existing = this.metrics.get(initiativeId) || [];
    existing.push(metric);
    this.metrics.set(initiativeId, existing);
    return metric;
  }

  getLatest(initiativeId: string): ChangeAdoptionMetric | undefined {
    const history = this.metrics.get(initiativeId) || [];
    return history[history.length - 1];
  }

  getAdoptionTrend(initiativeId: string): 'accelerating' | 'steady' | 'stalling' {
    const history = this.metrics.get(initiativeId) || [];
    if (history.length < 2) return 'steady';
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    const diff = curr.adoptionRate - prev.adoptionRate;
    return diff > 10 ? 'accelerating' : diff < -5 ? 'stalling' : 'steady';
  }

  getLowAdoptionInitiatives(threshold = 50): string[] {
    return Array.from(this.metrics.entries())
      .filter(([, history]) => {
        const latest = history[history.length - 1];
        return latest && latest.adoptionRate < threshold;
      })
      .map(([id]) => id);
  }
}

class ResistanceAnalyzer {
  private records: Map<string, ResistanceRecord[]> = new Map();
  private counter = 0;

  record(initiativeId: string, segment: string, resistanceLevel: ResistanceRecord['resistanceLevel'], rootCauses: string[], affectedCount: number): ResistanceRecord {
    const resistanceId = `resist-${Date.now()}-${++this.counter}`;
    const mitigationMap: Record<ResistanceRecord['resistanceLevel'], string[]> = {
      low: ['informational_webinar'],
      medium: ['town_hall', 'manager_coaching'],
      high: ['one_on_one_sessions', 'champion_program', 'incentive_alignment'],
      critical: ['executive_intervention', 'change_champion_intensive', 'process_redesign']
    };
    const record: ResistanceRecord = {
      resistanceId, initiativeId, segment, resistanceLevel,
      rootCauses, affectedCount,
      mitigationActions: mitigationMap[resistanceLevel],
      recordedAt: Date.now()
    };
    const existing = this.records.get(initiativeId) || [];
    existing.push(record);
    this.records.set(initiativeId, existing);
    logger.debug('Resistance recorded', { initiativeId, segment, resistanceLevel, affectedCount });
    return record;
  }

  getCriticalResistance(): ResistanceRecord[] {
    return Array.from(this.records.values()).flat()
      .filter(r => r.resistanceLevel === 'critical' && !r.resolvedAt)
      .sort((a, b) => b.affectedCount - a.affectedCount);
  }

  resolve(resistanceId: string): boolean {
    for (const records of this.records.values()) {
      const rec = records.find(r => r.resistanceId === resistanceId);
      if (rec) { rec.resolvedAt = Date.now(); return true; }
    }
    return false;
  }

  getResistanceByInitiative(initiativeId: string): ResistanceRecord[] {
    return this.records.get(initiativeId) || [];
  }
}

class ChangeImpactAssessor {
  private assessments: Map<string, ChangeImpactAssessment> = new Map();
  private counter = 0;

  assess(initiativeId: string, productivityImpact: number, moralImpact: number, operationalRisk: number, businessContinuityRisk: number): ChangeImpactAssessment {
    const overallChangeReadiness = Math.max(0, 100 - (operationalRisk * 0.4 + businessContinuityRisk * 0.3) + (productivityImpact * 0.2 + moralImpact * 0.1));
    const assessmentId = `chgassess-${Date.now()}-${++this.counter}`;
    const assessment: ChangeImpactAssessment = {
      assessmentId, initiativeId, productivityImpact, moralImpact,
      operationalRisk: Math.max(0, Math.min(100, operationalRisk)),
      businessContinuityRisk: Math.max(0, Math.min(100, businessContinuityRisk)),
      overallChangeReadiness: Math.max(0, Math.min(100, overallChangeReadiness)),
      assessedAt: Date.now()
    };
    this.assessments.set(initiativeId, assessment);
    return assessment;
  }

  getHighRiskInitiatives(threshold = 70): ChangeImpactAssessment[] {
    return Array.from(this.assessments.values())
      .filter(a => a.operationalRisk >= threshold || a.businessContinuityRisk >= threshold)
      .sort((a, b) => b.operationalRisk - a.operationalRisk);
  }

  getAssessment(initiativeId: string): ChangeImpactAssessment | undefined {
    return this.assessments.get(initiativeId);
  }
}

export const changeInitiativeTracker = new ChangeInitiativeTracker();
export const adoptionMonitor = new AdoptionMonitor();
export const resistanceAnalyzer = new ResistanceAnalyzer();
export const changeImpactAssessor = new ChangeImpactAssessor();

export { ChangeInitiative, ChangeAdoptionMetric, ResistanceRecord, ChangeImpactAssessment };
