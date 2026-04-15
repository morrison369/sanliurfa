/**
 * Phase 189: Co-selling Workflows
 * Opportunity management, deal registration, commission tracking, pipeline analysis
 */

import { logger } from './logger';

interface CoSellOpportunity {
  opportunityId: string;
  partnerId: string;
  customerName: string;
  dealValue: number;
  currency: string;
  stage: 'identified' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  productIds: string[];
  expectedCloseDate: number;
  createdAt: number;
  updatedAt: number;
  notes: string;
}

interface DealRegistration {
  registrationId: string;
  opportunityId: string;
  partnerId: string;
  registeredAt: number;
  approvedAt?: number;
  expiresAt: number;
  status: 'pending' | 'approved' | 'expired' | 'rejected';
  protectionDays: number;
}

interface CommissionRecord {
  commissionId: string;
  partnerId: string;
  opportunityId: string;
  dealValue: number;
  commissionRate: number;
  commissionAmount: number;
  period: string;
  status: 'pending' | 'approved' | 'paid';
  createdAt: number;
  paidAt?: number;
}

class CoSellOpportunityManager {
  private opportunities: Map<string, CoSellOpportunity> = new Map();
  private counter = 0;

  create(partnerId: string, customerName: string, dealValue: number, productIds: string[], expectedCloseDays: number): CoSellOpportunity {
    const opportunityId = `opp-${Date.now()}-${++this.counter}`;
    const opp: CoSellOpportunity = {
      opportunityId, partnerId, customerName, dealValue,
      currency: 'USD', stage: 'identified', productIds,
      expectedCloseDate: Date.now() + expectedCloseDays * 24 * 60 * 60 * 1000,
      createdAt: Date.now(), updatedAt: Date.now(), notes: ''
    };
    this.opportunities.set(opportunityId, opp);
    logger.debug('Co-sell opportunity created', { opportunityId, partnerId, dealValue });
    return opp;
  }

  advance(opportunityId: string, stage: CoSellOpportunity['stage'], notes?: string): CoSellOpportunity | undefined {
    const opp = this.opportunities.get(opportunityId);
    if (opp) {
      opp.stage = stage;
      opp.updatedAt = Date.now();
      if (notes) opp.notes = notes;
      logger.debug('Opportunity advanced', { opportunityId, stage });
      return opp;
    }
    return undefined;
  }

  getOpportunity(opportunityId: string): CoSellOpportunity | undefined {
    return this.opportunities.get(opportunityId);
  }

  getPartnerPipeline(partnerId: string): CoSellOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.partnerId === partnerId && !['closed_won', 'closed_lost'].includes(o.stage));
  }

  getWonDeals(partnerId?: string): CoSellOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.stage === 'closed_won' && (!partnerId || o.partnerId === partnerId));
  }

  getPipelineValue(partnerId?: string): number {
    return this.getPartnerPipeline(partnerId || '').reduce((sum, o) => sum + o.dealValue, 0);
  }
}

class CoSellDealRegistration {
  private registrations: Map<string, DealRegistration> = new Map();
  private counter = 0;

  register(opportunityId: string, partnerId: string, protectionDays: number = 90): DealRegistration {
    const registrationId = `reg-${Date.now()}-${++this.counter}`;
    const registration: DealRegistration = {
      registrationId, opportunityId, partnerId,
      registeredAt: Date.now(),
      expiresAt: Date.now() + protectionDays * 24 * 60 * 60 * 1000,
      status: 'pending', protectionDays
    };
    this.registrations.set(registrationId, registration);
    logger.debug('Deal registered', { registrationId, opportunityId, partnerId });
    return registration;
  }

  approve(registrationId: string): DealRegistration | undefined {
    const reg = this.registrations.get(registrationId);
    if (reg) {
      reg.status = 'approved';
      reg.approvedAt = Date.now();
      return reg;
    }
    return undefined;
  }

  isProtected(opportunityId: string, partnerId: string): boolean {
    return Array.from(this.registrations.values()).some(r =>
      r.opportunityId === opportunityId &&
      r.partnerId === partnerId &&
      r.status === 'approved' &&
      r.expiresAt > Date.now()
    );
  }

  getPartnerRegistrations(partnerId: string): DealRegistration[] {
    return Array.from(this.registrations.values()).filter(r => r.partnerId === partnerId);
  }
}

class PartnerCommissionTracker {
  private commissions: Map<string, CommissionRecord> = new Map();
  private rates: Map<string, number> = new Map(); // partnerId -> rate
  private counter = 0;

  setCommissionRate(partnerId: string, rate: number): void {
    this.rates.set(partnerId, Math.max(0, Math.min(1, rate)));
  }

  record(partnerId: string, opportunityId: string, dealValue: number): CommissionRecord {
    const rate = this.rates.get(partnerId) || 0.1;
    const commissionId = `commission-${Date.now()}-${++this.counter}`;
    const record: CommissionRecord = {
      commissionId, partnerId, opportunityId, dealValue,
      commissionRate: rate,
      commissionAmount: dealValue * rate,
      period: new Date().toISOString().substring(0, 7),
      status: 'pending', createdAt: Date.now()
    };
    this.commissions.set(commissionId, record);
    logger.debug('Commission recorded', { commissionId, partnerId, amount: record.commissionAmount.toFixed(2) });
    return record;
  }

  approve(commissionId: string): boolean {
    const c = this.commissions.get(commissionId);
    if (c) { c.status = 'approved'; return true; }
    return false;
  }

  markPaid(commissionId: string): boolean {
    const c = this.commissions.get(commissionId);
    if (c && c.status === 'approved') { c.status = 'paid'; c.paidAt = Date.now(); return true; }
    return false;
  }

  getPartnerEarnings(partnerId: string, period?: string): number {
    return Array.from(this.commissions.values())
      .filter(c => c.partnerId === partnerId && c.status === 'paid' && (!period || c.period === period))
      .reduce((sum, c) => sum + c.commissionAmount, 0);
  }

  getPendingCommissions(partnerId?: string): CommissionRecord[] {
    return Array.from(this.commissions.values())
      .filter(c => c.status === 'pending' && (!partnerId || c.partnerId === partnerId));
  }
}

class CoSellPipelineAnalyzer {
  analyze(opportunities: CoSellOpportunity[]): {
    totalPipelineValue: number;
    weightedPipelineValue: number;
    stageDistribution: Record<string, number>;
    avgDealSize: number;
    winRate: number;
  } {
    const stageWeights: Record<string, number> = {
      identified: 0.1, qualified: 0.25, proposal: 0.5,
      negotiation: 0.75, closed_won: 1.0, closed_lost: 0
    };

    const totalPipelineValue = opportunities.reduce((sum, o) => sum + o.dealValue, 0);
    const weightedPipelineValue = opportunities.reduce((sum, o) => sum + o.dealValue * (stageWeights[o.stage] || 0), 0);

    const stageDistribution: Record<string, number> = {};
    for (const opp of opportunities) {
      stageDistribution[opp.stage] = (stageDistribution[opp.stage] || 0) + 1;
    }

    const avgDealSize = opportunities.length > 0 ? totalPipelineValue / opportunities.length : 0;
    const closed = opportunities.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost').length;
    const won = opportunities.filter(o => o.stage === 'closed_won').length;
    const winRate = closed > 0 ? (won / closed) * 100 : 0;

    return { totalPipelineValue, weightedPipelineValue, stageDistribution, avgDealSize, winRate };
  }

  forecastRevenue(opportunities: CoSellOpportunity[]): number {
    const weights: Record<string, number> = { identified: 0.1, qualified: 0.25, proposal: 0.5, negotiation: 0.75, closed_won: 1.0, closed_lost: 0 };
    return opportunities.reduce((sum, o) => sum + o.dealValue * (weights[o.stage] || 0), 0);
  }

  getVelocity(opportunities: CoSellOpportunity[]): number {
    const closed = opportunities.filter(o => o.stage === 'closed_won');
    if (!closed.length) return 0;
    const avgCycleDays = closed.reduce((sum, o) => sum + (o.updatedAt - o.createdAt), 0) / closed.length / 86400000;
    return avgCycleDays > 0 ? closed.length / avgCycleDays : 0;
  }
}

export const coSellOpportunityManager = new CoSellOpportunityManager();
export const coSellDealRegistration = new CoSellDealRegistration();
export const partnerCommissionTracker = new PartnerCommissionTracker();
export const coSellPipelineAnalyzer = new CoSellPipelineAnalyzer();

export { CoSellOpportunity, DealRegistration, CommissionRecord };
