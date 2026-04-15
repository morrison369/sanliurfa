/**
 * Phase 339: Vendor Collaboration Intelligence
 * Joint planning, performance co-creation, shared KPIs, collaboration scoring
 */

import { logger } from './logger';

interface VendorCollaborationRecord {
  collaborationId: string;
  vendorId: string;
  vendorName: string;
  collaborationType: 'strategic_partnership' | 'preferred_supplier' | 'innovation_partner' | 'co_development' | 'joint_go_to_market';
  startDate: number;
  contractValueUSD: number;
  sharedRevenuePotentialUSD: number;
  collaborationScore: number;      // 0-100 composite
  communicationFrequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  executiveSponsor?: string;
  vendorExecutiveSponsor?: string;
  jointInitiatives: string[];
  sharedKpis: string[];
  status: 'active' | 'review' | 'at_risk' | 'paused' | 'terminated';
  lastReviewDate: number;
  nextReviewDate: number;
  createdAt: number;
}

interface JointPlanRecord {
  planId: string;
  collaborationId: string;
  vendorName: string;
  planPeriod: string;
  objectives: { objective: string; owner: 'us' | 'vendor' | 'joint'; targetDate: number; status: 'pending' | 'in_progress' | 'complete' | 'missed' }[];
  totalObjectives: number;
  completedObjectives: number;
  completionPct: number;
  sharedInvestmentUSD: number;
  ourInvestmentUSD: number;
  vendorInvestmentUSD: number;
  projectedJointRevenueUSD: number;
  actualJointRevenueUSD: number;
  revenueAttainmentPct: number;
  createdAt: number;
  updatedAt: number;
}

interface SharedKpiRecord {
  kpiId: string;
  collaborationId: string;
  vendorName: string;
  kpiName: string;
  category: 'revenue' | 'quality' | 'delivery' | 'innovation' | 'satisfaction';
  ourTarget: number;
  vendorTarget: number;
  jointTarget: number;
  ourActual: number;
  vendorActual: number;
  jointActual: number;
  ourAttainmentPct: number;
  vendorAttainmentPct: number;
  jointAttainmentPct: number;
  ragStatus: 'green' | 'amber' | 'red';
  period: string;
  updatedAt: number;
}

interface CollaborationHealthRecord {
  healthId: string;
  period: string;
  totalCollaborations: number;
  activeCount: number;
  atRiskCount: number;
  avgCollaborationScore: number;
  totalSharedRevenueUSD: number;
  topCollaboration: string;
  keyRisks: string[];
  recommendations: string[];
  calculatedAt: number;
}

class VendorCollaborationManager {
  private collaborations: Map<string, VendorCollaborationRecord> = new Map();
  private counter = 0;

  establish(vendorId: string, vendorName: string, type: VendorCollaborationRecord['collaborationType'], contractValue: number, sharedRevenuePotential: number, communicationFreq: VendorCollaborationRecord['communicationFrequency'], jointInitiatives: string[], sharedKpis: string[], execSponsor?: string, vendorExecSponsor?: string): VendorCollaborationRecord {
    const collaborationId = `vcol-${Date.now()}-${++this.counter}`;
    // Initial score based on type and commitment signals
    const typeScore = { strategic_partnership: 80, preferred_supplier: 60, innovation_partner: 75, co_development: 70, joint_go_to_market: 65 };
    const initScore = Math.min(100, typeScore[type] + (execSponsor ? 10 : 0) + Math.min(jointInitiatives.length * 2, 10));

    const record: VendorCollaborationRecord = {
      collaborationId, vendorId, vendorName, collaborationType: type,
      startDate: Date.now(), contractValueUSD: contractValue,
      sharedRevenuePotentialUSD: sharedRevenuePotential, collaborationScore: initScore,
      communicationFrequency: communicationFreq, executiveSponsor: execSponsor,
      vendorExecutiveSponsor: vendorExecSponsor, jointInitiatives, sharedKpis,
      status: 'active', lastReviewDate: Date.now(),
      nextReviewDate: Date.now() + 90 * 86400000, createdAt: Date.now()
    };
    this.collaborations.set(collaborationId, record);
    logger.debug('Vendor collaboration established', { collaborationId, vendorName, type, initScore });
    return record;
  }

  updateScore(collaborationId: string, score: number, status?: VendorCollaborationRecord['status']): boolean {
    const col = this.collaborations.get(collaborationId);
    if (!col) return false;
    col.collaborationScore = Math.min(100, Math.max(0, score));
    if (status) col.status = status;
    return true;
  }

  getAtRisk(): VendorCollaborationRecord[] {
    return Array.from(this.collaborations.values()).filter(c => c.status === 'at_risk' || c.collaborationScore < 50);
  }

  getStrategic(): VendorCollaborationRecord[] {
    return Array.from(this.collaborations.values()).filter(c => c.collaborationType === 'strategic_partnership');
  }

  getAll(): VendorCollaborationRecord[] {
    return Array.from(this.collaborations.values());
  }

  getCollaboration(id: string): VendorCollaborationRecord | undefined {
    return this.collaborations.get(id);
  }
}

class JointPlanManager {
  private plans: JointPlanRecord[] = [];
  private counter = 0;

  create(collaborationId: string, vendorName: string, period: string, objectives: JointPlanRecord['objectives'], sharedInvestment: number, ourInvestment: number, vendorInvestment: number, projectedJointRevenue: number): JointPlanRecord {
    const planId = `jplan-${Date.now()}-${++this.counter}`;
    const completed = objectives.filter(o => o.status === 'complete').length;
    const completionPct = objectives.length > 0 ? Math.round((completed / objectives.length) * 100 * 10) / 10 : 0;

    const record: JointPlanRecord = {
      planId, collaborationId, vendorName, planPeriod: period, objectives,
      totalObjectives: objectives.length, completedObjectives: completed, completionPct,
      sharedInvestmentUSD: sharedInvestment, ourInvestmentUSD: ourInvestment,
      vendorInvestmentUSD: vendorInvestment, projectedJointRevenueUSD: projectedJointRevenue,
      actualJointRevenueUSD: 0, revenueAttainmentPct: 0,
      createdAt: Date.now(), updatedAt: Date.now()
    };
    this.plans.push(record);
    logger.debug('Joint plan created', { planId, vendorName, period, projectedJointRevenue });
    return record;
  }

  updateRevenue(planId: string, actualRevenue: number): boolean {
    const plan = this.plans.find(p => p.planId === planId);
    if (!plan) return false;
    plan.actualJointRevenueUSD = actualRevenue;
    plan.revenueAttainmentPct = plan.projectedJointRevenueUSD > 0
      ? Math.round((actualRevenue / plan.projectedJointRevenueUSD) * 100 * 10) / 10 : 0;
    plan.updatedAt = Date.now();
    return true;
  }

  getByCollaboration(collaborationId: string): JointPlanRecord[] {
    return this.plans.filter(p => p.collaborationId === collaborationId);
  }

  getTotalJointRevenue(): number {
    return this.plans.reduce((s, p) => s + p.actualJointRevenueUSD, 0);
  }
}

class SharedKpiTracker {
  private kpis: SharedKpiRecord[] = [];
  private counter = 0;

  track(collaborationId: string, vendorName: string, kpiName: string, category: SharedKpiRecord['category'], period: string, ourTarget: number, vendorTarget: number, jointTarget: number, ourActual: number, vendorActual: number, jointActual: number): SharedKpiRecord {
    const kpiId = `sharedkpi-${Date.now()}-${++this.counter}`;
    const ourAtt = ourTarget > 0 ? Math.round((ourActual / ourTarget) * 100 * 10) / 10 : 0;
    const vendorAtt = vendorTarget > 0 ? Math.round((vendorActual / vendorTarget) * 100 * 10) / 10 : 0;
    const jointAtt = jointTarget > 0 ? Math.round((jointActual / jointTarget) * 100 * 10) / 10 : 0;
    const minAtt = Math.min(ourAtt, vendorAtt, jointAtt);
    const rag: SharedKpiRecord['ragStatus'] = minAtt >= 90 ? 'green' : minAtt >= 70 ? 'amber' : 'red';

    const record: SharedKpiRecord = {
      kpiId, collaborationId, vendorName, kpiName, category, period,
      ourTarget, vendorTarget, jointTarget, ourActual, vendorActual, jointActual,
      ourAttainmentPct: ourAtt, vendorAttainmentPct: vendorAtt, jointAttainmentPct: jointAtt,
      ragStatus: rag, updatedAt: Date.now()
    };
    this.kpis.push(record);
    return record;
  }

  getRedKpis(): SharedKpiRecord[] {
    return this.kpis.filter(k => k.ragStatus === 'red');
  }

  getByCollaboration(collaborationId: string): SharedKpiRecord[] {
    return this.kpis.filter(k => k.collaborationId === collaborationId);
  }
}

class CollaborationHealthMonitor {
  private healthRecords: CollaborationHealthRecord[] = [];
  private counter = 0;

  evaluate(period: string, collaborations: VendorCollaborationRecord[], plans: JointPlanRecord[]): CollaborationHealthRecord {
    const healthId = `colhealth-${Date.now()}-${++this.counter}`;
    const active = collaborations.filter(c => c.status === 'active');
    const atRisk = collaborations.filter(c => c.status === 'at_risk' || c.collaborationScore < 50);
    const avgScore = active.length > 0 ? Math.round(active.reduce((s, c) => s + c.collaborationScore, 0) / active.length * 10) / 10 : 0;
    const totalRevenue = plans.reduce((s, p) => s + p.actualJointRevenueUSD, 0);
    const topCollaboration = [...active].sort((a, b) => b.collaborationScore - a.collaborationScore)[0]?.vendorName || 'N/A';

    const risks: string[] = [];
    if (atRisk.length > 0) risks.push(`${atRisk.length} collaborations at risk`);
    if (avgScore < 60) risks.push('Average collaboration health below threshold');
    const recs: string[] = [];
    if (atRisk.length > 0) recs.push('Schedule executive reviews for at-risk collaborations');
    if (avgScore < 70) recs.push('Increase communication cadence with underperforming vendors');

    const record: CollaborationHealthRecord = {
      healthId, period, totalCollaborations: collaborations.length, activeCount: active.length,
      atRiskCount: atRisk.length, avgCollaborationScore: avgScore, totalSharedRevenueUSD: totalRevenue,
      topCollaboration, keyRisks: risks, recommendations: recs, calculatedAt: Date.now()
    };
    this.healthRecords.push(record);
    logger.debug('Collaboration health evaluated', { period, avgScore, atRisk: atRisk.length });
    return record;
  }

  getLatest(): CollaborationHealthRecord | undefined {
    return this.healthRecords[this.healthRecords.length - 1];
  }
}

export const vendorCollaborationManager = new VendorCollaborationManager();
export const jointPlanManager = new JointPlanManager();
export const sharedKpiTracker = new SharedKpiTracker();
export const collaborationHealthMonitor = new CollaborationHealthMonitor();

export { VendorCollaborationRecord, JointPlanRecord, SharedKpiRecord, CollaborationHealthRecord };
