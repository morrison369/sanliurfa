/**
 * Phase 322: Sustainability Intelligence
 * Carbon tracking, ESG metrics, energy optimization, sustainability reporting
 */

import { logger } from './logger';

interface CarbonEmissionRecord {
  emissionId: string;
  sourceId: string;
  sourceName: string;
  scope: 'scope1' | 'scope2' | 'scope3';   // GHG Protocol scopes
  category: 'energy' | 'transport' | 'waste' | 'procurement' | 'travel' | 'facilities' | 'manufacturing';
  activityAmount: number;
  activityUnit: string;
  emissionFactor: number;           // CO2e per unit
  co2eTonnes: number;               // calculated emissions
  period: string;
  isEstimated: boolean;
  verifiedBy?: string;
  offsetCo2eTonnes: number;
  netCo2eTonnes: number;
  createdAt: number;
}

interface ESGMetricRecord {
  metricId: string;
  pillar: 'environmental' | 'social' | 'governance';
  metricName: string;
  unit: string;
  currentValue: number;
  targetValue: number;
  baselineValue: number;
  baselineYear: number;
  progressPct: number;
  ragStatus: 'green' | 'amber' | 'red';
  trend: 'improving' | 'stable' | 'declining';
  isPubliclyReported: boolean;
  reportingFramework: string;       // GRI, SASB, TCFD, etc.
  updatedAt: number;
  createdAt: number;
}

interface EnergyUsageRecord {
  usageId: string;
  facilityId: string;
  facilityName: string;
  period: string;
  electricityKwh: number;
  naturalGasMMBtu?: number;
  renewableEnergyKwh: number;
  renewableEnergyPct: number;
  totalEnergyMwh: number;
  energyIntensity: number;          // kWh per unit of output
  costUSD: number;
  co2eTonnes: number;
  yoyChangePct: number;
  trend: 'improving' | 'stable' | 'declining';
  certifications: string[];         // ISO 50001, LEED, BREEAM, etc.
  calculatedAt: number;
}

interface SustainabilityReportRecord {
  reportId: string;
  period: string;
  framework: 'GRI' | 'SASB' | 'TCFD' | 'CDP' | 'CSRD' | 'custom';
  totalScope1Co2eTonnes: number;
  totalScope2Co2eTonnes: number;
  totalScope3Co2eTonnes: number;
  totalCo2eTonnes: number;
  offsetsTonnes: number;
  netCo2eTonnes: number;
  renewableEnergyPct: number;
  wasteRecyclingRatePct: number;
  waterUsageM3: number;
  esgScoreEnvironmental: number;    // 0-100
  esgScoreSocial: number;
  esgScoreGovernance: number;
  overallEsgScore: number;
  carbonIntensity: number;          // CO2e per $1M revenue
  keyAchievements: string[];
  keyRisks: string[];
  targets: { name: string; targetYear: number; progressPct: number }[];
  generatedAt: number;
}

class CarbonTracker {
  private emissions: CarbonEmissionRecord[] = [];
  private counter = 0;

  record(sourceId: string, sourceName: string, scope: CarbonEmissionRecord['scope'], category: CarbonEmissionRecord['category'], activityAmount: number, activityUnit: string, emissionFactor: number, period: string, isEstimated = false, offsetTonnes = 0): CarbonEmissionRecord {
    const emissionId = `emission-${Date.now()}-${++this.counter}`;
    const co2eTonnes = Math.round(activityAmount * emissionFactor * 1000) / 1000;
    const netCo2e = Math.max(0, co2eTonnes - offsetTonnes);
    const record: CarbonEmissionRecord = {
      emissionId, sourceId, sourceName, scope, category,
      activityAmount, activityUnit, emissionFactor, co2eTonnes,
      period, isEstimated, offsetCo2eTonnes: offsetTonnes,
      netCo2eTonnes: Math.round(netCo2e * 1000) / 1000, createdAt: Date.now()
    };
    this.emissions.push(record);
    logger.debug('Carbon emission recorded', { emissionId, scope, co2eTonnes, netCo2e });
    return record;
  }

  getTotalByScope(scope: CarbonEmissionRecord['scope'], period?: string): number {
    return this.emissions
      .filter(e => e.scope === scope && (!period || e.period === period))
      .reduce((s, e) => s + e.netCo2eTonnes, 0);
  }

  getTotalEmissions(period?: string): number {
    return ['scope1', 'scope2', 'scope3'].reduce((s, scope) =>
      s + this.getTotalByScope(scope as CarbonEmissionRecord['scope'], period), 0);
  }

  getTopEmitters(limit = 5): CarbonEmissionRecord[] {
    return [...this.emissions].sort((a, b) => b.netCo2eTonnes - a.netCo2eTonnes).slice(0, limit);
  }

  getAll(): CarbonEmissionRecord[] {
    return [...this.emissions];
  }
}

class ESGMetricsManager {
  private metrics: Map<string, ESGMetricRecord> = new Map();
  private counter = 0;

  define(name: string, pillar: ESGMetricRecord['pillar'], unit: string, baseline: number, baselineYear: number, target: number, framework: string, isPublic = true): ESGMetricRecord {
    const metricId = `esg-${Date.now()}-${++this.counter}`;
    const record: ESGMetricRecord = {
      metricId, pillar, metricName: name, unit, currentValue: baseline,
      targetValue: target, baselineValue: baseline, baselineYear,
      progressPct: 0, ragStatus: 'amber', trend: 'stable',
      isPubliclyReported: isPublic, reportingFramework: framework,
      updatedAt: Date.now(), createdAt: Date.now()
    };
    this.metrics.set(metricId, record);
    return record;
  }

  update(metricId: string, currentValue: number): boolean {
    const metric = this.metrics.get(metricId);
    if (!metric) return false;
    const prev = metric.currentValue;
    metric.currentValue = currentValue;
    // Progress: % of gap closed from baseline to target
    const totalGap = metric.targetValue - metric.baselineValue;
    metric.progressPct = totalGap !== 0 ? Math.round(((currentValue - metric.baselineValue) / totalGap) * 100 * 10) / 10 : 0;
    metric.ragStatus = metric.progressPct >= 80 ? 'green' : metric.progressPct >= 50 ? 'amber' : 'red';
    // For reduction targets (target < baseline), flip direction
    const isReductionTarget = metric.targetValue < metric.baselineValue;
    metric.trend = isReductionTarget
      ? (currentValue < prev ? 'improving' : currentValue > prev ? 'declining' : 'stable')
      : (currentValue > prev ? 'improving' : currentValue < prev ? 'declining' : 'stable');
    metric.updatedAt = Date.now();
    return true;
  }

  getByPillar(pillar: ESGMetricRecord['pillar']): ESGMetricRecord[] {
    return Array.from(this.metrics.values()).filter(m => m.pillar === pillar);
  }

  getOffTrack(): ESGMetricRecord[] {
    return Array.from(this.metrics.values()).filter(m => m.ragStatus === 'red');
  }

  getAll(): ESGMetricRecord[] {
    return Array.from(this.metrics.values());
  }
}

class EnergyManager {
  private records: EnergyUsageRecord[] = [];
  private counter = 0;

  record(facilityId: string, facilityName: string, period: string, electricityKwh: number, renewableKwh: number, naturalGasMMBtu: number, outputUnits: number, costUSD: number, certifications: string[] = []): EnergyUsageRecord {
    const usageId = `energy-${Date.now()}-${++this.counter}`;
    const totalMwh = (electricityKwh + (naturalGasMMBtu * 293.07)) / 1000;  // MMBtu→kWh conversion
    const renewablePct = electricityKwh > 0 ? Math.round((renewableKwh / electricityKwh) * 100 * 10) / 10 : 0;
    const intensity = outputUnits > 0 ? Math.round((electricityKwh / outputUnits) * 100) / 100 : 0;
    const co2e = ((electricityKwh - renewableKwh) * 0.000233 + naturalGasMMBtu * 0.0531);  // tCO2e

    const prev = this.records.filter(r => r.facilityId === facilityId).slice(-1)[0];
    const yoyChange = prev ? Math.round(((electricityKwh - prev.electricityKwh) / prev.electricityKwh) * 100 * 10) / 10 : 0;
    const trend: EnergyUsageRecord['trend'] = yoyChange < -5 ? 'improving' : yoyChange > 5 ? 'declining' : 'stable';

    const record: EnergyUsageRecord = {
      usageId, facilityId, facilityName, period, electricityKwh,
      naturalGasMMBtu, renewableEnergyKwh: renewableKwh, renewableEnergyPct: renewablePct,
      totalEnergyMwh: Math.round(totalMwh * 100) / 100, energyIntensity: intensity,
      costUSD, co2eTonnes: Math.round(co2e * 100) / 100, yoyChangePct: yoyChange,
      trend, certifications, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTotalCo2e(): number {
    return Math.round(this.records.reduce((s, r) => s + r.co2eTonnes, 0) * 100) / 100;
  }

  getHighConsumers(limit = 5): EnergyUsageRecord[] {
    return [...this.records].sort((a, b) => b.electricityKwh - a.electricityKwh).slice(0, limit);
  }

  getAll(): EnergyUsageRecord[] {
    return [...this.records];
  }
}

class SustainabilityReportGenerator {
  private reports: SustainabilityReportRecord[] = [];
  private counter = 0;

  generate(period: string, framework: SustainabilityReportRecord['framework'], emissions: CarbonEmissionRecord[], esgMetrics: ESGMetricRecord[], energyRecords: EnergyUsageRecord[], totalRevenueUSD: number, achievements: string[], risks: string[], targets: SustainabilityReportRecord['targets']): SustainabilityReportRecord {
    const reportId = `susrep-${Date.now()}-${++this.counter}`;

    const scope1 = Math.round(emissions.filter(e => e.scope === 'scope1').reduce((s, e) => s + e.netCo2eTonnes, 0) * 100) / 100;
    const scope2 = Math.round(emissions.filter(e => e.scope === 'scope2').reduce((s, e) => s + e.netCo2eTonnes, 0) * 100) / 100;
    const scope3 = Math.round(emissions.filter(e => e.scope === 'scope3').reduce((s, e) => s + e.netCo2eTonnes, 0) * 100) / 100;
    const total = Math.round((scope1 + scope2 + scope3) * 100) / 100;
    const offsets = Math.round(emissions.reduce((s, e) => s + e.offsetCo2eTonnes, 0) * 100) / 100;
    const net = Math.max(0, total - offsets);

    const totalElectricity = energyRecords.reduce((s, e) => s + e.electricityKwh, 0);
    const totalRenewable = energyRecords.reduce((s, e) => s + e.renewableEnergyKwh, 0);
    const renewablePct = totalElectricity > 0 ? Math.round((totalRenewable / totalElectricity) * 100 * 10) / 10 : 0;
    const waterUsage = 0; // placeholder

    const envMetrics = esgMetrics.filter(m => m.pillar === 'environmental');
    const socialMetrics = esgMetrics.filter(m => m.pillar === 'social');
    const govMetrics = esgMetrics.filter(m => m.pillar === 'governance');
    const avgScore = (metrics: ESGMetricRecord[]) => metrics.length > 0
      ? Math.round(metrics.reduce((s, m) => s + Math.max(0, m.progressPct), 0) / metrics.length * 10) / 10 : 0;

    const envScore = avgScore(envMetrics);
    const socialScore = avgScore(socialMetrics);
    const govScore = avgScore(govMetrics);
    const overall = Math.round((envScore + socialScore + govScore) / 3 * 10) / 10;
    const carbonIntensity = totalRevenueUSD > 0 ? Math.round((net / (totalRevenueUSD / 1000000)) * 100) / 100 : 0;

    const record: SustainabilityReportRecord = {
      reportId, period, framework,
      totalScope1Co2eTonnes: scope1, totalScope2Co2eTonnes: scope2, totalScope3Co2eTonnes: scope3,
      totalCo2eTonnes: total, offsetsTonnes: offsets, netCo2eTonnes: Math.round(net * 100) / 100,
      renewableEnergyPct: renewablePct, wasteRecyclingRatePct: 0, waterUsageM3: waterUsage,
      esgScoreEnvironmental: envScore, esgScoreSocial: socialScore, esgScoreGovernance: govScore,
      overallEsgScore: overall, carbonIntensity,
      keyAchievements: achievements, keyRisks: risks, targets, generatedAt: Date.now()
    };
    this.reports.push(record);
    logger.debug('Sustainability report generated', { period, framework, totalCo2e: total, overallEsgScore: overall });
    return record;
  }

  getLatest(): SustainabilityReportRecord | undefined {
    return this.reports[this.reports.length - 1];
  }

  getCarbonTrend(): number[] {
    return this.reports.map(r => r.netCo2eTonnes);
  }
}

export const carbonTracker = new CarbonTracker();
export const esgMetricsManager = new ESGMetricsManager();
export const energyManager = new EnergyManager();
export const sustainabilityReportGenerator = new SustainabilityReportGenerator();

export { CarbonEmissionRecord, ESGMetricRecord, EnergyUsageRecord, SustainabilityReportRecord };
