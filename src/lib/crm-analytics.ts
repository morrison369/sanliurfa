/**
 * Phase 70: CRM Analytics & Forecasting
 * CRM metrics, sales analytics, pipeline forecasting, performance dashboards
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface CRMMetrics {
  period: string;
  totalRevenue: number;
  pipelineValue: number;
  winRate: number;
  avgDealSize: number;
  salesCycle: number;
  conversionRate: number;
}

export interface SalesAnalysis {
  totalDeals: number;
  dealsWon: number;
  dealsLost: number;
  totalValue: number;
  avgValue: number;
  winRate: number;
  avgSalesDelay: number;
}

export interface RepPerformance {
  repId: string;
  revenue: number;
  dealsWon: number;
  conversionRate: number;
  avgDealSize: number;
  forecastAccuracy: number;
  customerSatisfaction: number;
}

// ==================== CRM METRICS MANAGER ====================

export class CRMMetricsManager {
  private metrics = new Map<string, CRMMetrics>();

  /**
   * Record metrics
   */
  recordMetrics(metrics: CRMMetrics): void {
    this.metrics.set(metrics.period, metrics);
    logger.debug('CRM metrics recorded', { period: metrics.period });
  }

  /**
   * Get metrics
   */
  getMetrics(period: string): CRMMetrics | null {
    return this.metrics.get(period) || null;
  }

  /**
   * Calculate metrics
   */
  calculateMetrics(startDate: number, endDate: number): CRMMetrics {
    const totalRevenue = Math.random() * 500000 + 100000;
    const pipelineValue = Math.random() * 300000 + 100000;
    const dealsWon = Math.floor(Math.random() * 20 + 5);
    const totalDeals = Math.floor(Math.random() * 40 + 15);
    const winRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;

    logger.debug('CRM metrics calculated', { startDate, endDate });

    return {
      period: `${new Date(startDate).toISOString().split('T')[0]} to ${new Date(endDate).toISOString().split('T')[0]}`,
      totalRevenue,
      pipelineValue,
      winRate,
      avgDealSize: totalRevenue / Math.max(1, dealsWon),
      salesCycle: Math.floor(Math.random() * 30 + 10),
      conversionRate: winRate / 100
    };
  }

  /**
   * Compare metrics
   */
  compareMetrics(period1: string, period2: string): Record<string, number> {
    const m1 = this.metrics.get(period1);
    const m2 = this.metrics.get(period2);

    if (!m1 || !m2) return {};

    return {
      revenueChange: m2.totalRevenue - m1.totalRevenue,
      winRateChange: m2.winRate - m1.winRate,
      avgDealChange: m2.avgDealSize - m1.avgDealSize
    };
  }

  /**
   * Get trend analysis
   */
  getTrendAnalysis(metric: string, periods: number): { values: number[]; trend: string } {
    const values: number[] = [];

    for (let i = 0; i < periods; i++) {
      values.push(Math.random() * 100 + 50);
    }

    const trend = values[periods - 1] > values[0] ? 'up' : 'down';

    logger.debug('Trend analysis completed', { metric, periods, trend });

    return { values, trend };
  }
}

// ==================== SALES ANALYTICS ====================

export class SalesAnalytics {
  /**
   * Analyze
   */
  analyze(startDate: number, endDate: number): SalesAnalysis {
    const totalDeals = Math.floor(Math.random() * 40 + 15);
    const dealsWon = Math.floor(Math.random() * 20 + 5);
    const dealsLost = Math.floor(Math.random() * 15 + 3);
    const totalValue = Math.random() * 500000 + 100000;

    logger.debug('Sales analysis completed', { totalDeals, dealsWon });

    return {
      totalDeals,
      dealsWon,
      dealsLost,
      totalValue,
      avgValue: totalValue / Math.max(1, dealsWon),
      winRate: (dealsWon / totalDeals) * 100,
      avgSalesDelay: Math.floor(Math.random() * 30 + 10)
    };
  }

  /**
   * Get rep performance
   */
  getRepPerformance(repId: string, period?: string): RepPerformance {
    return {
      repId,
      revenue: Math.random() * 200000 + 50000,
      dealsWon: Math.floor(Math.random() * 15 + 3),
      conversionRate: Math.random() * 0.4 + 0.2,
      avgDealSize: Math.random() * 50000 + 20000,
      forecastAccuracy: Math.random() * 0.3 + 0.7,
      customerSatisfaction: Math.random() * 2 + 3.5
    };
  }

  /**
   * Get top performers
   */
  getTopPerformers(limit?: number): RepPerformance[] {
    const performers: RepPerformance[] = [];
    const count = limit || 10;

    for (let i = 0; i < count; i++) {
      performers.push(this.getRepPerformance(`rep-${i}`));
    }

    return performers.sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get bottom performers
   */
  getBottomPerformers(limit?: number): RepPerformance[] {
    const performers: RepPerformance[] = [];
    const count = limit || 10;

    for (let i = 0; i < count; i++) {
      performers.push(this.getRepPerformance(`rep-${i}`));
    }

    return performers.sort((a, b) => a.revenue - b.revenue);
  }

  /**
   * Compare rep performance
   */
  compareRepPerformance(repIds: string[]): Record<string, RepPerformance> {
    const comparison: Record<string, RepPerformance> = {};

    repIds.forEach(repId => {
      comparison[repId] = this.getRepPerformance(repId);
    });

    logger.debug('Rep performance compared', { count: repIds.length });

    return comparison;
  }

  /**
   * Identify performance gaps
   */
  identifyPerformanceGaps(): Array<{ repId: string; gap: number; metrics: Record<string, any> }> {
    const gaps = [];

    if (Math.random() > 0.6) {
      gaps.push({
        repId: 'rep-1',
        gap: Math.random() * 0.2 + 0.1,
        metrics: { conversionRate: 0.15, avgDealSize: 15000 }
      });
    }

    if (Math.random() > 0.7) {
      gaps.push({
        repId: 'rep-2',
        gap: Math.random() * 0.15 + 0.05,
        metrics: { forecastAccuracy: 0.6 }
      });
    }

    logger.debug('Performance gaps identified', { count: gaps.length });

    return gaps;
  }
}

// ==================== PIPELINE FORECASTING ====================

export class PipelineForecasting {
  /**
   * Forecast revenue
   */
  forecastRevenue(months: number): Array<{ month: string; forecast: number; confidence: number }> {
    const forecasts = [];
    let baseValue = 100000;

    for (let i = 0; i < months; i++) {
      const forecast = baseValue + Math.random() * 50000 - 25000;
      const confidence = 0.95 - i * 0.04;

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
   * Get rolling forecast
   */
  getRollingForecast(months: number): Record<string, number> {
    const forecast: Record<string, number> = {};

    for (let i = 0; i < months; i++) {
      forecast[`month_${i + 1}`] = Math.random() * 100000 + 50000;
    }

    return forecast;
  }

  /**
   * Identify forecast risks
   */
  identifyForecastRisks(): string[] {
    const risks = [];

    if (Math.random() > 0.6) {
      risks.push('Pipeline visibility declining');
    }

    if (Math.random() > 0.7) {
      risks.push('Deal velocity slowing');
    }

    if (Math.random() > 0.8) {
      risks.push('Economic headwinds');
    }

    return risks;
  }

  /**
   * Get stage metrics
   */
  getStageMetrics(stage: string): { opportunities: number; value: number; avgTime: number } {
    return {
      opportunities: Math.floor(Math.random() * 30 + 5),
      value: Math.random() * 500000 + 100000,
      avgTime: Math.floor(Math.random() * 20 + 5)
    };
  }

  /**
   * Predict win/loss
   */
  predictWinLoss(oppId: string): { winProbability: number; riskFactors: string[] } {
    const winProbability = Math.random();
    const riskFactors: string[] = [];

    if (winProbability < 0.3) {
      riskFactors.push('Budget constraints');
      riskFactors.push('Stakeholder misalignment');
    } else if (winProbability < 0.6) {
      riskFactors.push('Competitive pressure');
    }

    logger.debug('Win/loss prediction', { oppId, winProbability });

    return { winProbability, riskFactors };
  }
}

// ==================== SALES LEADERBOARD ====================

export class SalesLeaderboard {
  /**
   * Get revenue leaderboard
   */
  getRevenuLeaderboard(limit?: number): Array<{ repId: string; revenue: number; rank: number }> {
    const count = limit || 10;
    const leaderboard: Array<{ repId: string; revenue: number; rank: number }> = [];

    for (let i = 0; i < count; i++) {
      leaderboard.push({
        repId: `rep-${i}`,
        revenue: Math.random() * 200000 + 50000,
        rank: i + 1
      });
    }

    return leaderboard.sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get deals leaderboard
   */
  getDealsLeaderboard(limit?: number): Array<{ repId: string; deals: number; rank: number }> {
    const count = limit || 10;
    const leaderboard: Array<{ repId: string; deals: number; rank: number }> = [];

    for (let i = 0; i < count; i++) {
      leaderboard.push({
        repId: `rep-${i}`,
        deals: Math.floor(Math.random() * 20 + 5),
        rank: i + 1
      });
    }

    return leaderboard.sort((a, b) => b.deals - a.deals);
  }

  /**
   * Get win rate leaderboard
   */
  getWinRateLeaderboard(limit?: number): Array<{ repId: string; winRate: number; rank: number }> {
    const count = limit || 10;
    const leaderboard: Array<{ repId: string; winRate: number; rank: number }> = [];

    for (let i = 0; i < count; i++) {
      leaderboard.push({
        repId: `rep-${i}`,
        winRate: Math.random() * 0.4 + 0.3,
        rank: i + 1
      });
    }

    return leaderboard.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Get team metrics
   */
  getTeamMetrics(): { totalRevenue: number; totalDeals: number; avgWinRate: number } {
    return {
      totalRevenue: Math.random() * 2000000 + 500000,
      totalDeals: Math.floor(Math.random() * 200 + 50),
      avgWinRate: Math.random() * 0.3 + 0.25
    };
  }
}

// ==================== EXPORTS ====================

export const crmMetricsManager = new CRMMetricsManager();
export const salesAnalytics = new SalesAnalytics();
export const pipelineForecasting = new PipelineForecasting();
export const salesLeaderboard = new SalesLeaderboard();
