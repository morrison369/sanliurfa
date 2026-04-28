/**
 * Phase 316: Executive Dashboard Intelligence
 * KPI aggregation, executive scorecards, board reporting, trend alerts
 */

import { logger } from './logger';

interface KPIRecord {
  kpiId: string;
  kpiName: string;
  category: 'revenue' | 'growth' | 'profitability' | 'customer' | 'operations' | 'people' | 'innovation';
  owner: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  unit: string;
  targetValue: number;
  currentValue: number;
  previousValue: number;
  attainmentPct: number;
  changeVsPreviousPct: number;
  ragStatus: 'green' | 'amber' | 'red';
  greenThreshold: number;          // attainment % above which = green
  amberThreshold: number;          // attainment % above which = amber (else red)
  trend: 'up' | 'down' | 'flat';
  isLeadingIndicator: boolean;
  updatedAt: number;
  createdAt: number;
}

interface ExecutiveScorecardRecord {
  scorecardId: string;
  period: string;
  generatedFor: string;            // 'CEO' | 'CFO' | 'COO' | 'Board'
  overallPerformanceScore: number; // 0-100
  greenKPIs: number;
  amberKPIs: number;
  redKPIs: number;
  totalKPIs: number;
  topWins: string[];
  topRisks: string[];
  topOpportunities: string[];
  kpiSummaryByCategory: Record<string, { avg: number; red: number }>;
  narrativeSummary: string;
  generatedAt: number;
}

interface BoardReportRecord {
  reportId: string;
  period: string;
  revenueUSD: number;
  revenueVsTargetPct: number;
  revenueYoyGrowthPct: number;
  ebitdaUSD: number;
  ebitdaMarginPct: number;
  cashPositionUSD: number;
  burnRateMonths?: number;
  customerCount: number;
  nrrPct: number;                  // Net Revenue Retention
  churnRatePct: number;
  npsScore: number;
  headcount: number;
  headcountVsLastPeriod: number;
  strategicInitiativesOnTrack: number;
  strategicInitiativesTotal: number;
  topRisks: string[];
  topDecisionsRequired: string[];
  generatedAt: number;
}

interface TrendAlertRecord {
  alertId: string;
  kpiId: string;
  kpiName: string;
  alertType: 'threshold_breach' | 'rapid_change' | 'consecutive_miss' | 'forecast_miss' | 'anomaly';
  severity: 'critical' | 'warning' | 'info';
  currentValue: number;
  thresholdValue: number;
  deviationPct: number;
  consecutiveMissCount?: number;
  message: string;
  recommendedAction: string;
  owner: string;
  acknowledged: boolean;
  generatedAt: number;
}

class KPIManager {
  private kpis: Map<string, KPIRecord> = new Map();
  private counter = 0;

  define(name: string, category: KPIRecord['category'], owner: string, frequency: KPIRecord['frequency'], unit: string, target: number, greenThreshold: number, amberThreshold: number, isLeading: boolean): KPIRecord {
    const kpiId = `kpi-${Date.now()}-${++this.counter}`;
    const record: KPIRecord = {
      kpiId, kpiName: name, category, owner, frequency, unit, targetValue: target,
      currentValue: 0, previousValue: 0, attainmentPct: 0, changeVsPreviousPct: 0,
      ragStatus: 'red', greenThreshold, amberThreshold, trend: 'flat',
      isLeadingIndicator: isLeading, updatedAt: Date.now(), createdAt: Date.now()
    };
    this.kpis.set(kpiId, record);
    return record;
  }

  update(kpiId: string, currentValue: number): boolean {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return false;
    kpi.previousValue = kpi.currentValue;
    kpi.currentValue = currentValue;
    kpi.attainmentPct = kpi.targetValue !== 0 ? Math.round((currentValue / kpi.targetValue) * 100 * 10) / 10 : 0;
    kpi.changeVsPreviousPct = kpi.previousValue !== 0 ? Math.round(((currentValue - kpi.previousValue) / kpi.previousValue) * 100 * 10) / 10 : 0;
    kpi.ragStatus = kpi.attainmentPct >= kpi.greenThreshold ? 'green' : kpi.attainmentPct >= kpi.amberThreshold ? 'amber' : 'red';
    kpi.trend = currentValue > kpi.previousValue ? 'up' : currentValue < kpi.previousValue ? 'down' : 'flat';
    kpi.updatedAt = Date.now();
    return true;
  }

  getRedKPIs(): KPIRecord[] {
    return Array.from(this.kpis.values()).filter(k => k.ragStatus === 'red');
  }

  getKPIsByCategory(category: KPIRecord['category']): KPIRecord[] {
    return Array.from(this.kpis.values()).filter(k => k.category === category);
  }

  getAll(): KPIRecord[] {
    return Array.from(this.kpis.values());
  }

  getKPI(id: string): KPIRecord | undefined {
    return this.kpis.get(id);
  }
}

class ExecutiveScorecardGenerator {
  private scorecards: ExecutiveScorecardRecord[] = [];
  private counter = 0;

  generate(period: string, audience: string, kpis: KPIRecord[], wins: string[], risks: string[], opportunities: string[]): ExecutiveScorecardRecord {
    const green = kpis.filter(k => k.ragStatus === 'green').length;
    const amber = kpis.filter(k => k.ragStatus === 'amber').length;
    const red = kpis.filter(k => k.ragStatus === 'red').length;
    const total = kpis.length;

    const overallScore = total > 0 ? Math.round(((green * 100 + amber * 60) / total) * 10) / 10 : 0;

    const byCategory: Record<string, { avg: number; red: number }> = {};
    kpis.forEach(k => {
      if (!byCategory[k.category]) byCategory[k.category] = { avg: 0, red: 0 };
      byCategory[k.category].avg += k.attainmentPct;
      if (k.ragStatus === 'red') byCategory[k.category].red++;
    });
    Object.keys(byCategory).forEach(cat => {
      const catKpis = kpis.filter(k => k.category === cat);
      byCategory[cat].avg = catKpis.length > 0 ? Math.round(byCategory[cat].avg / catKpis.length * 10) / 10 : 0;
    });

    const narrative = `${period} performance: ${green}/${total} KPIs on track. ${red > 0 ? `${red} KPIs require immediate attention.` : 'No critical KPIs.'}`;

    const scorecardId = `scorecard-${Date.now()}-${++this.counter}`;
    const record: ExecutiveScorecardRecord = {
      scorecardId, period, generatedFor: audience, overallPerformanceScore: overallScore,
      greenKPIs: green, amberKPIs: amber, redKPIs: red, totalKPIs: total,
      topWins: wins, topRisks: risks, topOpportunities: opportunities,
      kpiSummaryByCategory: byCategory, narrativeSummary: narrative,
      generatedAt: Date.now()
    };
    this.scorecards.push(record);
    logger.debug('Executive scorecard generated', { period, audience, overallScore, green, red });
    return record;
  }

  getLatest(audience?: string): ExecutiveScorecardRecord | undefined {
    const filtered = audience ? this.scorecards.filter(s => s.generatedFor === audience) : this.scorecards;
    return filtered[filtered.length - 1];
  }

  getPerformanceTrend(): number[] {
    return this.scorecards.map(s => s.overallPerformanceScore);
  }
}

class BoardReportGenerator {
  private reports: BoardReportRecord[] = [];
  private counter = 0;

  generate(period: string, revenue: number, revenueTarget: number, previousRevenue: number, ebitda: number, cash: number, customers: number, nrr: number, churn: number, nps: number, headcount: number, prevHeadcount: number, initiativesOnTrack: number, initiativesTotal: number, risks: string[], decisions: string[], burnRate?: number): BoardReportRecord {
    const reportId = `boardrep-${Date.now()}-${++this.counter}`;
    const record: BoardReportRecord = {
      reportId, period, revenueUSD: revenue,
      revenueVsTargetPct: revenueTarget > 0 ? Math.round((revenue / revenueTarget) * 100 * 10) / 10 : 0,
      revenueYoyGrowthPct: previousRevenue > 0 ? Math.round(((revenue - previousRevenue) / previousRevenue) * 100 * 10) / 10 : 0,
      ebitdaUSD: ebitda, ebitdaMarginPct: revenue > 0 ? Math.round((ebitda / revenue) * 100 * 10) / 10 : 0,
      cashPositionUSD: cash, burnRateMonths: burnRate,
      customerCount: customers, nrrPct: nrr, churnRatePct: churn, npsScore: nps,
      headcount, headcountVsLastPeriod: headcount - prevHeadcount,
      strategicInitiativesOnTrack: initiativesOnTrack, strategicInitiativesTotal: initiativesTotal,
      topRisks: risks, topDecisionsRequired: decisions, generatedAt: Date.now()
    };
    this.reports.push(record);
    logger.debug('Board report generated', { period, revenue, ebitdaMargin: record.ebitdaMarginPct });
    return record;
  }

  getLatest(): BoardReportRecord | undefined {
    return this.reports[this.reports.length - 1];
  }

  getRevenueTrend(): number[] {
    return this.reports.map(r => r.revenueUSD);
  }
}

class TrendAlertEngine {
  private alerts: TrendAlertRecord[] = [];
  private counter = 0;

  evaluate(kpis: KPIRecord[], _consecutiveMissThreshold = 3): TrendAlertRecord[] {
    const newAlerts: TrendAlertRecord[] = [];

    kpis.forEach(k => {
      if (k.ragStatus === 'red') {
        const alertId = `talert-${Date.now()}-${++this.counter}`;
        const deviation = k.attainmentPct - k.amberThreshold;
        const alert: TrendAlertRecord = {
          alertId, kpiId: k.kpiId, kpiName: k.kpiName, alertType: 'threshold_breach',
          severity: k.attainmentPct < k.amberThreshold * 0.7 ? 'critical' : 'warning',
          currentValue: k.currentValue, thresholdValue: k.targetValue * k.amberThreshold / 100,
          deviationPct: Math.round(deviation * 10) / 10,
          message: `${k.kpiName} at ${k.attainmentPct}% of target (threshold: ${k.amberThreshold}%)`,
          recommendedAction: `Review ${k.kpiName} drivers and escalate to ${k.owner}`,
          owner: k.owner, acknowledged: false, generatedAt: Date.now()
        };
        this.alerts.push(alert);
        newAlerts.push(alert);
      }
      if (Math.abs(k.changeVsPreviousPct) >= 20) {
        const alertId = `talert-${Date.now()}-${++this.counter}`;
        const alert: TrendAlertRecord = {
          alertId, kpiId: k.kpiId, kpiName: k.kpiName, alertType: 'rapid_change',
          severity: 'warning', currentValue: k.currentValue, thresholdValue: k.previousValue,
          deviationPct: k.changeVsPreviousPct,
          message: `${k.kpiName} changed ${k.changeVsPreviousPct}% vs previous period`,
          recommendedAction: `Investigate root cause of rapid ${k.changeVsPreviousPct > 0 ? 'increase' : 'decrease'} in ${k.kpiName}`,
          owner: k.owner, acknowledged: false, generatedAt: Date.now()
        };
        this.alerts.push(alert);
        newAlerts.push(alert);
      }
    });
    return newAlerts;
  }

  getCriticalAlerts(): TrendAlertRecord[] {
    return this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged);
  }

  getUnacknowledgedAlerts(): TrendAlertRecord[] {
    return this.alerts.filter(a => !a.acknowledged).sort((a, b) => {
      const sev = { critical: 3, warning: 2, info: 1 };
      return sev[b.severity] - sev[a.severity];
    });
  }

  acknowledge(alertId: string): boolean {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }
}

export const kpiManager = new KPIManager();
export const executiveScorecardGenerator = new ExecutiveScorecardGenerator();
export const boardReportGenerator = new BoardReportGenerator();
export const trendAlertEngine = new TrendAlertEngine();

export type {KPIRecord, ExecutiveScorecardRecord, BoardReportRecord, TrendAlertRecord};