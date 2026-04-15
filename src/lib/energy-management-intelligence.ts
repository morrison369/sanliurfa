/**
 * Phase 278: Energy Management Intelligence
 * Energy consumption analytics, cost optimization, renewable integration, carbon footprint
 */

import { logger } from './logger';

interface EnergyConsumptionRecord {
  recordId: string;
  facilityId: string;
  facilityName: string;
  period: string;
  electricityKwh: number;
  naturalGasCubicM: number;
  waterCubicM: number;
  totalEnergyKwh: number;       // normalized
  electricityCost: number;
  gasCost: number;
  waterCost: number;
  totalCost: number;
  costPerSqFt: number;
  intensityKwhPerSqFt: number;  // energy use intensity (EUI)
  benchmarkEUI: number;         // industry benchmark
  performanceVsBenchmarkPct: number;  // negative = better than benchmark
  recordedAt: number;
}

interface RenewableEnergyRecord {
  recordId: string;
  facilityId: string;
  sourceType: 'solar' | 'wind' | 'hydro' | 'geothermal' | 'biomass';
  installedCapacityKw: number;
  generatedKwh: number;
  selfConsumedKwh: number;
  gridExportedKwh: number;
  capacityFactorPct: number;    // actual vs theoretical max
  costSavings: number;
  carbonOffsetTonnes: number;
  roiPct: number;
  period: string;
  recordedAt: number;
}

interface EnergyAnomalyRecord {
  anomalyId: string;
  facilityId: string;
  detectedAt: number;
  anomalyType: 'consumption_spike' | 'after_hours_usage' | 'equipment_malfunction' | 'billing_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedKwh: number;
  actualKwh: number;
  deviationPct: number;
  estimatedWasteCost: number;
  resolved: boolean;
}

interface EnergyCarbonRecord {
  recordId: string;
  facilityId: string;
  period: string;
  scope1Tonnes: number;        // direct (on-site combustion)
  scope2Tonnes: number;        // indirect (purchased electricity)
  totalCarbonTonnes: number;
  carbonIntensityKgPerKwh: number;
  renewablePercentagePct: number;
  carbonOffsetsPurchased: number;
  netCarbonTonnes: number;
  targetCarbonTonnes: number;
  progressToTargetPct: number;
  calculatedAt: number;
}

class EnergyConsumptionTracker {
  private records: Map<string, EnergyConsumptionRecord[]> = new Map();
  private counter = 0;

  record(facilityId: string, facilityName: string, period: string, electricityKwh: number, gasM3: number, waterM3: number, elecCost: number, gasCost: number, waterCost: number, sqFt: number, benchmarkEUI: number): EnergyConsumptionRecord {
    const totalKwh = electricityKwh + gasM3 * 10.55;  // gas to kWh conversion
    const totalCost = elecCost + gasCost + waterCost;
    const eui = sqFt > 0 ? totalKwh / sqFt : 0;
    const performanceVsBenchmark = benchmarkEUI > 0 ? ((eui - benchmarkEUI) / benchmarkEUI) * 100 : 0;

    const recordId = `energy-${Date.now()}-${++this.counter}`;
    const record: EnergyConsumptionRecord = {
      recordId, facilityId, facilityName, period, electricityKwh, naturalGasCubicM: gasM3,
      waterCubicM: waterM3, totalEnergyKwh: totalKwh, electricityCost: elecCost,
      gasCost, waterCost, totalCost, costPerSqFt: sqFt > 0 ? totalCost / sqFt : 0,
      intensityKwhPerSqFt: eui, benchmarkEUI, performanceVsBenchmarkPct: performanceVsBenchmark,
      recordedAt: Date.now()
    };
    const history = this.records.get(facilityId) || [];
    history.push(record);
    this.records.set(facilityId, history);
    logger.debug('Energy consumption recorded', { facilityId, period, totalKwh });
    return record;
  }

  getLatest(facilityId: string): EnergyConsumptionRecord | undefined {
    const history = this.records.get(facilityId) || [];
    return history[history.length - 1];
  }

  getHighConsumptionFacilities(threshold: number): EnergyConsumptionRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is EnergyConsumptionRecord => !!r && r.intensityKwhPerSqFt > threshold)
      .sort((a, b) => b.intensityKwhPerSqFt - a.intensityKwhPerSqFt);
  }

  getTotalCost(period?: string): number {
    return Array.from(this.records.values())
      .flat()
      .filter(r => !period || r.period === period)
      .reduce((s, r) => s + r.totalCost, 0);
  }
}

class RenewableEnergyManager {
  private records: Map<string, RenewableEnergyRecord[]> = new Map();
  private counter = 0;

  record(facilityId: string, source: RenewableEnergyRecord['sourceType'], capacityKw: number, generatedKwh: number, selfConsumed: number, elecRate: number, carbonFactor: number, installationCost: number, period: string): RenewableEnergyRecord {
    const gridExported = generatedKwh - selfConsumed;
    const capacityFactor = capacityKw > 0 ? (generatedKwh / (capacityKw * 8760)) * 100 : 0;
    const costSavings = selfConsumed * elecRate + Math.max(0, gridExported) * elecRate * 0.5;
    const carbonOffset = generatedKwh * carbonFactor / 1000;  // kWh × kg/kWh → tonnes
    const roi = installationCost > 0 ? (costSavings / installationCost) * 100 : 0;

    const recordId = `renew-${Date.now()}-${++this.counter}`;
    const record: RenewableEnergyRecord = {
      recordId, facilityId, sourceType: source, installedCapacityKw: capacityKw,
      generatedKwh, selfConsumedKwh: selfConsumed, gridExportedKwh: gridExported,
      capacityFactorPct: capacityFactor, costSavings, carbonOffsetTonnes: carbonOffset,
      roiPct: roi, period, recordedAt: Date.now()
    };
    const existing = this.records.get(facilityId) || [];
    existing.push(record);
    this.records.set(facilityId, existing);
    return record;
  }

  getTotalCarbonOffset(): number {
    return Array.from(this.records.values()).flat().reduce((s, r) => s + r.carbonOffsetTonnes, 0);
  }

  getTotalCostSavings(): number {
    return Array.from(this.records.values()).flat().reduce((s, r) => s + r.costSavings, 0);
  }

  getByFacility(facilityId: string): RenewableEnergyRecord[] {
    return this.records.get(facilityId) || [];
  }
}

class EnergyAnomalyDetector {
  private anomalies: EnergyAnomalyRecord[] = [];
  private counter = 0;

  detect(facilityId: string, type: EnergyAnomalyRecord['anomalyType'], expectedKwh: number, actualKwh: number, costPerKwh: number): EnergyAnomalyRecord {
    const deviationPct = expectedKwh > 0 ? ((actualKwh - expectedKwh) / expectedKwh) * 100 : 0;
    const severity: EnergyAnomalyRecord['severity'] =
      Math.abs(deviationPct) >= 50 ? 'critical' :
      Math.abs(deviationPct) >= 30 ? 'high' :
      Math.abs(deviationPct) >= 15 ? 'medium' : 'low';
    const wasteCost = Math.max(0, actualKwh - expectedKwh) * costPerKwh;

    const anomalyId = `enanomaly-${Date.now()}-${++this.counter}`;
    const record: EnergyAnomalyRecord = {
      anomalyId, facilityId, detectedAt: Date.now(), anomalyType: type, severity,
      expectedKwh, actualKwh, deviationPct, estimatedWasteCost: wasteCost, resolved: false
    };
    this.anomalies.push(record);
    logger.debug('Energy anomaly detected', { facilityId, type, severity, deviationPct });
    return record;
  }

  resolve(anomalyId: string): boolean {
    const anomaly = this.anomalies.find(a => a.anomalyId === anomalyId);
    if (!anomaly) return false;
    anomaly.resolved = true;
    return true;
  }

  getUnresolved(): EnergyAnomalyRecord[] {
    return this.anomalies.filter(a => !a.resolved)
      .sort((a, b) => {
        const s = { critical: 0, high: 1, medium: 2, low: 3 };
        return s[a.severity] - s[b.severity];
      });
  }

  getTotalWasteCost(): number {
    return this.anomalies.filter(a => !a.resolved).reduce((s, a) => s + a.estimatedWasteCost, 0);
  }
}

class CarbonFootprintTracker {
  private records: Map<string, EnergyCarbonRecord[]> = new Map();
  private counter = 0;

  calculate(facilityId: string, period: string, scope1: number, electricityKwh: number, gridEmissionFactor: number, renewablePct: number, offsetsPurchased: number, targetTonnes: number): EnergyCarbonRecord {
    const scope2 = electricityKwh * (1 - renewablePct / 100) * gridEmissionFactor / 1000;
    const total = scope1 + scope2;
    const netCarbon = Math.max(0, total - offsetsPurchased);
    const carbonIntensity = electricityKwh > 0 ? (scope2 * 1000) / electricityKwh : 0;
    const progress = targetTonnes > 0 ? Math.min(100, ((targetTonnes - netCarbon) / targetTonnes) * 100) : 0;

    const recordId = `carbonfp-${Date.now()}-${++this.counter}`;
    const record: EnergyCarbonRecord = {
      recordId, facilityId, period, scope1Tonnes: scope1, scope2Tonnes: scope2,
      totalCarbonTonnes: total, carbonIntensityKgPerKwh: carbonIntensity,
      renewablePercentagePct: renewablePct, carbonOffsetsPurchased: offsetsPurchased,
      netCarbonTonnes: netCarbon, targetCarbonTonnes: targetTonnes,
      progressToTargetPct: Math.max(0, progress), calculatedAt: Date.now()
    };
    const history = this.records.get(facilityId) || [];
    history.push(record);
    this.records.set(facilityId, history);
    return record;
  }

  getLatest(facilityId: string): EnergyCarbonRecord | undefined {
    const history = this.records.get(facilityId) || [];
    return history[history.length - 1];
  }

  getTotalNetCarbon(): number {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is EnergyCarbonRecord => !!r)
      .reduce((s, r) => s + r.netCarbonTonnes, 0);
  }

  getOffTargetFacilities(): EnergyCarbonRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is EnergyCarbonRecord => !!r && r.netCarbonTonnes > r.targetCarbonTonnes);
  }
}

export const energyConsumptionTracker = new EnergyConsumptionTracker();
export const renewableEnergyManager = new RenewableEnergyManager();
export const energyAnomalyDetector = new EnergyAnomalyDetector();
export const carbonFootprintTracker = new CarbonFootprintTracker();

export { EnergyConsumptionRecord, RenewableEnergyRecord, EnergyAnomalyRecord, EnergyCarbonRecord };
