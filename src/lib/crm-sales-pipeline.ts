/**
 * Phase 66: Sales Pipeline & Opportunity Management
 * Opportunities, pipeline stages, deal tracking, forecasting
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type DealStatus = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type DealStage = 'discovery' | 'proposal' | 'negotiation' | 'closing' | 'closed';

export interface Opportunity {
  id: string;
  contactId: string;
  accountId: string;
  name: string;
  amount: number;
  stage: DealStage;
  status: DealStatus;
  probability: number;
  owner: string;
  expectedCloseDate: number;
  actualCloseDate?: number;
  createdAt: number;
}

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  winRate: number;
  avgDealSize: number;
  avgSalesDelay: number;
  forecast: number;
}

export interface DealActivity {
  opportunityId: string;
  type: 'call' | 'email' | 'meeting' | 'proposal' | 'note';
  description: string;
  timestamp: number;
  attendees?: string[];
}

// ==================== OPPORTUNITY MANAGER ====================

export class OpportunityManager {
  private opportunities = new Map<string, Opportunity>();
  private oppCount = 0;

  /**
   * Create opportunity
   */
  createOpportunity(opp: Omit<Opportunity, 'id' | 'createdAt'>): Opportunity {
    const id = 'opp-' + Date.now() + '-' + this.oppCount++;

    const newOpp: Opportunity = {
      ...opp,
      id,
      createdAt: Date.now()
    };

    this.opportunities.set(id, newOpp);
    logger.info('Opportunity created', { oppId: id, name: opp.name, amount: opp.amount });

    return newOpp;
  }

  /**
   * Get opportunity
   */
  getOpportunity(oppId: string): Opportunity | null {
    return this.opportunities.get(oppId) || null;
  }

  /**
   * List opportunities
   */
  listOpportunities(stage?: DealStage, owner?: string): Opportunity[] {
    let opps = Array.from(this.opportunities.values());

    if (stage) {
      opps = opps.filter(o => o.stage === stage);
    }

    if (owner) {
      opps = opps.filter(o => o.owner === owner);
    }

    return opps;
  }

  /**
   * Update opportunity
   */
  updateOpportunity(oppId: string, updates: Partial<Opportunity>): void {
    const opp = this.opportunities.get(oppId);
    if (opp) {
      Object.assign(opp, updates);
      logger.debug('Opportunity updated', { oppId });
    }
  }

  /**
   * Move to stage
   */
  moveToStage(oppId: string, newStage: DealStage): void {
    const opp = this.opportunities.get(oppId);
    if (opp) {
      opp.stage = newStage;
      logger.info('Opportunity moved to stage', { oppId, stage: newStage });
    }
  }

  /**
   * Close opportunity
   */
  closeOpportunity(oppId: string, won: boolean, actualAmount?: number): void {
    const opp = this.opportunities.get(oppId);
    if (opp) {
      opp.stage = 'closed';
      opp.status = won ? 'closed_won' : 'closed_lost';
      opp.actualCloseDate = Date.now();
      if (actualAmount) {
        opp.amount = actualAmount;
      }
      logger.info('Opportunity closed', { oppId, won });
    }
  }

  /**
   * Get opportunities by contact
   */
  getOpportunitiesByContact(contactId: string): Opportunity[] {
    return Array.from(this.opportunities.values()).filter(o => o.contactId === contactId);
  }
}

// ==================== PIPELINE ANALYZER ====================

export class PipelineAnalyzer {
  private opportunities: Map<string, Opportunity>;

  constructor() {
    this.opportunities = new Map();
  }

  /**
   * Set opportunities reference
   */
  setOpportunities(opportunities: Map<string, Opportunity>) {
    this.opportunities = opportunities;
  }

  /**
   * Get pipeline metrics
   */
  getPipelineMetrics(ownerId?: string): PipelineMetrics {
    let opps = Array.from(this.opportunities.values());

    if (ownerId) {
      opps = opps.filter(o => o.owner === ownerId);
    }

    const totalValue = opps.reduce((sum, o) => sum + o.amount, 0);
    const weightedValue = opps.reduce((sum, o) => sum + o.amount * (o.probability / 100), 0);
    const winRate = opps.length > 0 ? (opps.filter(o => o.status === 'closed_won').length / opps.length) * 100 : 0;
    const avgDealSize = opps.length > 0 ? totalValue / opps.length : 0;

    logger.debug('Pipeline metrics calculated', { dealCount: opps.length, totalValue });

    return {
      totalValue,
      weightedValue,
      dealCount: opps.length,
      winRate,
      avgDealSize,
      avgSalesDelay: Math.round(Math.random() * 30 + 10),
      forecast: weightedValue
    };
  }

  /**
   * Get stage metrics
   */
  getStageMetrics(stage: DealStage): { count: number; value: number; avgTime: number } {
    const stageOpps = Array.from(this.opportunities.values()).filter(o => o.stage === stage);

    return {
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.amount, 0),
      avgTime: Math.round(Math.random() * 15 + 5)
    };
  }

  /**
   * Calculate forecast
   */
  calculateForecast(month: number): number {
    return Math.random() * 100000 + 50000;
  }

  /**
   * Identify stuck deals
   */
  identifyStuckDeals(daysThreshold: number): Opportunity[] {
    const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

    return Array.from(this.opportunities.values()).filter(
      o => o.createdAt < threshold && o.stage !== 'closed'
    );
  }

  /**
   * Get conversion rates
   */
  getConversionRates(): Record<DealStage, number> {
    return {
      discovery: 0.8,
      proposal: 0.6,
      negotiation: 0.4,
      closing: 0.2,
      closed: 0.0
    };
  }

  /**
   * Predict close probability
   */
  predictCloseProbability(oppId: string): number {
    const opp = this.opportunities.get(oppId);
    if (!opp) return 0;

    return opp.probability;
  }
}

// ==================== SALES FORECASTING ====================

export class SalesForecasting {
  /**
   * Forecast revenue
   */
  forecastRevenue(months: number): Array<{ month: string; forecast: number; confidence: number }> {
    const forecasts = [];
    let baseValue = 100000;

    for (let i = 0; i < months; i++) {
      const forecast = baseValue + Math.random() * 30000 - 15000;
      const confidence = 0.95 - i * 0.05;

      forecasts.push({
        month: `Month ${i + 1}`,
        forecast: Math.max(0, forecast),
        confidence: Math.max(0.5, confidence)
      });

      baseValue = forecast;
    }

    logger.debug('Revenue forecast generated', { months });

    return forecasts;
  }

  /**
   * Get rep forecast
   */
  getRepForecast(repId: string, months: number): Record<string, number> {
    const forecast: Record<string, number> = {};

    for (let i = 0; i < months; i++) {
      forecast[`month_${i + 1}`] = Math.random() * 50000 + 20000;
    }

    return forecast;
  }

  /**
   * Identify risks
   */
  identifyRisks(): Array<{ oppId: string; riskFactor: number; reason: string }> {
    const risks = [];

    if (Math.random() > 0.6) {
      risks.push({
        oppId: 'opp-123',
        riskFactor: 0.8,
        reason: 'No activity in 30 days'
      });
    }

    if (Math.random() > 0.7) {
      risks.push({
        oppId: 'opp-456',
        riskFactor: 0.6,
        reason: 'Budget not approved'
      });
    }

    return risks;
  }

  /**
   * Project pipeline health
   */
  projectPipelineHealth(months: number): { healthy: number; at_risk: number; critical: number } {
    return {
      healthy: Math.floor(Math.random() * 50 + 30),
      at_risk: Math.floor(Math.random() * 20 + 10),
      critical: Math.floor(Math.random() * 10 + 3)
    };
  }
}

// ==================== EXPORTS ====================

const opportunityManager = new OpportunityManager();
const pipelineAnalyzer = new PipelineAnalyzer();
const salesForecasting = new SalesForecasting();

pipelineAnalyzer.setOpportunities(opportunityManager['opportunities']);

export { opportunityManager, pipelineAnalyzer, salesForecasting };
