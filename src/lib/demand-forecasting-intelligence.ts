/**
 * Phase 313: Demand Forecasting Intelligence
 * Time series forecasting, seasonal adjustment, demand sensing, accuracy tracking
 */

import { logger } from './logger';

interface DemandForecastRecord {
  forecastId: string;
  productId: string;
  productName: string;
  forecastPeriod: string;
  forecastHorizon: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  method: 'moving_average' | 'exponential_smoothing' | 'trend_adjusted' | 'seasonal' | 'ml_based';
  forecastedDemand: number;
  lowerBound: number;              // 80% confidence interval
  upperBound: number;
  seasonalityFactor: number;       // multiplier (1.0 = no seasonality)
  trendFactor: number;             // positive = growing demand
  promotionalLift: number;         // expected uplift from promotions (%)
  forecastedRevenue: number;
  requiredInventory: number;       // units needed including safety stock
  safetyStockDays: number;
  actualDemand?: number;
  forecastAccuracyPct?: number;    // 100 - MAPE
  status: 'draft' | 'approved' | 'actuals_recorded';
  createdAt: number;
}

interface DemandSensingRecord {
  recordId: string;
  productId: string;
  period: string;
  realTimeDemandSignal: number;    // units demanded in current period
  forecastedDemand: number;
  shortTermRevision: number;       // % adjustment from original forecast
  signalSources: string[];         // e.g., ['POS', 'web_traffic', 'search_trends']
  signalStrength: 'strong' | 'moderate' | 'weak';
  actionRequired: boolean;
  recommendedAction: string;
  calculatedAt: number;
}

interface SeasonalPatternRecord {
  recordId: string;
  productId: string;
  productCategory: string;
  seasonalIndexByPeriod: Record<string, number>;  // period → index (1.0 baseline)
  peakPeriod: string;
  troughPeriod: string;
  peakIndex: number;
  troughIndex: number;
  seasonalityStrength: number;     // 0-100 (how pronounced the pattern is)
  yearsOfData: number;
  calculatedAt: number;
}

interface ForecastAccuracyRecord {
  recordId: string;
  period: string;
  productId: string;
  forecastedDemand: number;
  actualDemand: number;
  absoluteError: number;
  mape: number;                    // Mean Absolute Percentage Error
  bias: number;                    // positive = over-forecast, negative = under-forecast
  accuracyPct: number;             // 100 - MAPE
  serviceLevelAchievedPct: number;
  stockoutOccurred: boolean;
  overStockCostUSD: number;
  understockCostUSD: number;
  recordedAt: number;
}

class DemandForecaster {
  private forecasts: Map<string, DemandForecastRecord> = new Map();
  private counter = 0;

  forecast(productId: string, name: string, period: string, horizon: DemandForecastRecord['forecastHorizon'], method: DemandForecastRecord['method'], baseDemand: number, seasonalFactor: number, trendFactor: number, promoLift: number, unitPrice: number, safetyStockDays: number): DemandForecastRecord {
    const forecastedDemand = Math.round(baseDemand * seasonalFactor * (1 + trendFactor / 100) * (1 + promoLift / 100));
    const uncertainty = method === 'ml_based' ? 0.1 : method === 'seasonal' ? 0.15 : 0.2;
    const lowerBound = Math.round(forecastedDemand * (1 - uncertainty));
    const upperBound = Math.round(forecastedDemand * (1 + uncertainty));

    const forecastId = `fcst-${Date.now()}-${++this.counter}`;
    const record: DemandForecastRecord = {
      forecastId, productId, productName: name, forecastPeriod: period, forecastHorizon: horizon,
      method, forecastedDemand, lowerBound, upperBound,
      seasonalityFactor: seasonalFactor, trendFactor, promotionalLift: promoLift,
      forecastedRevenue: forecastedDemand * unitPrice,
      requiredInventory: Math.round(forecastedDemand * (1 + safetyStockDays / 30)),
      safetyStockDays, status: 'draft', createdAt: Date.now()
    };
    this.forecasts.set(forecastId, record);
    logger.debug('Demand forecast created', { forecastId, productId, forecastedDemand });
    return record;
  }

  recordActual(forecastId: string, actualDemand: number): boolean {
    const f = this.forecasts.get(forecastId);
    if (!f) return false;
    f.actualDemand = actualDemand;
    const mape = f.forecastedDemand > 0 ? Math.abs(actualDemand - f.forecastedDemand) / f.forecastedDemand * 100 : 0;
    f.forecastAccuracyPct = Math.round((100 - mape) * 10) / 10;
    f.status = 'actuals_recorded';
    return true;
  }

  getLowAccuracyForecasts(threshold = 80): DemandForecastRecord[] {
    return Array.from(this.forecasts.values())
      .filter(f => f.forecastAccuracyPct !== undefined && f.forecastAccuracyPct < threshold);
  }

  getTotalForecastedRevenue(period: string): number {
    return Array.from(this.forecasts.values())
      .filter(f => f.forecastPeriod === period)
      .reduce((s, f) => s + f.forecastedRevenue, 0);
  }

  getForecast(id: string): DemandForecastRecord | undefined {
    return this.forecasts.get(id);
  }
}

class DemandSensor {
  private records: DemandSensingRecord[] = [];
  private counter = 0;

  sense(productId: string, period: string, realTimeSignal: number, originalForecast: number, sources: string[]): DemandSensingRecord {
    const revision = originalForecast > 0 ? Math.round(((realTimeSignal - originalForecast) / originalForecast) * 100 * 10) / 10 : 0;
    const deviationAbs = Math.abs(revision);
    const signalStrength: DemandSensingRecord['signalStrength'] = deviationAbs >= 20 ? 'strong' : deviationAbs >= 10 ? 'moderate' : 'weak';
    const actionRequired = deviationAbs >= 15;
    const action = revision > 15 ? 'Expedite replenishment order' : revision < -15 ? 'Reduce production order / defer shipment' : 'Monitor closely';

    const recordId = `demsen-${Date.now()}-${++this.counter}`;
    const record: DemandSensingRecord = {
      recordId, productId, period, realTimeDemandSignal: realTimeSignal,
      forecastedDemand: originalForecast, shortTermRevision: revision,
      signalSources: sources, signalStrength, actionRequired,
      recommendedAction: action, calculatedAt: Date.now()
    };
    this.records.push(record);
    if (actionRequired) logger.debug('Demand sensing alert', { productId, revision, action });
    return record;
  }

  getActionableSignals(): DemandSensingRecord[] {
    return this.records.filter(r => r.actionRequired).sort((a, b) => Math.abs(b.shortTermRevision) - Math.abs(a.shortTermRevision));
  }

  getAvgRevision(): number {
    if (!this.records.length) return 0;
    return Math.round(this.records.reduce((s, r) => s + r.shortTermRevision, 0) / this.records.length * 10) / 10;
  }
}

class SeasonalPatternAnalyzer {
  private patterns: Map<string, SeasonalPatternRecord> = new Map();
  private counter = 0;

  analyze(productId: string, category: string, indexByPeriod: Record<string, number>, yearsOfData: number): SeasonalPatternRecord {
    const entries = Object.entries(indexByPeriod);
    const peak = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
    const trough = entries.reduce((min, curr) => curr[1] < min[1] ? curr : min);
    const avg = entries.reduce((s, e) => s + e[1], 0) / entries.length;
    const variance = entries.reduce((s, e) => s + Math.pow(e[1] - avg, 2), 0) / entries.length;
    const strength = Math.round(Math.min(100, Math.sqrt(variance) * 100));

    const recordId = `seasonal-${Date.now()}-${++this.counter}`;
    const record: SeasonalPatternRecord = {
      recordId, productId, productCategory: category, seasonalIndexByPeriod: indexByPeriod,
      peakPeriod: peak[0], troughPeriod: trough[0],
      peakIndex: peak[1], troughIndex: trough[1],
      seasonalityStrength: strength, yearsOfData, calculatedAt: Date.now()
    };
    this.patterns.set(productId, record);
    return record;
  }

  getHighSeasonalityProducts(threshold = 40): SeasonalPatternRecord[] {
    return Array.from(this.patterns.values()).filter(p => p.seasonalityStrength >= threshold);
  }

  getPattern(productId: string): SeasonalPatternRecord | undefined {
    return this.patterns.get(productId);
  }
}

class ForecastAccuracyTracker {
  private records: ForecastAccuracyRecord[] = [];
  private counter = 0;

  track(period: string, productId: string, forecasted: number, actual: number, serviceLevel: number, stockout: boolean, overStockCost: number, understockCost: number): ForecastAccuracyRecord {
    const absError = Math.abs(actual - forecasted);
    const mape = forecasted > 0 ? Math.round((absError / forecasted) * 100 * 10) / 10 : 0;
    const bias = forecasted > 0 ? Math.round(((forecasted - actual) / forecasted) * 100 * 10) / 10 : 0;

    const recordId = `fcstacc-${Date.now()}-${++this.counter}`;
    const record: ForecastAccuracyRecord = {
      recordId, period, productId, forecastedDemand: forecasted, actualDemand: actual,
      absoluteError: absError, mape, bias, accuracyPct: Math.round((100 - mape) * 10) / 10,
      serviceLevelAchievedPct: serviceLevel, stockoutOccurred: stockout,
      overStockCostUSD: overStockCost, understockCostUSD: understockCost,
      recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getAvgAccuracy(period?: string): number {
    const filtered = period ? this.records.filter(r => r.period === period) : this.records;
    if (!filtered.length) return 0;
    return Math.round(filtered.reduce((s, r) => s + r.accuracyPct, 0) / filtered.length * 10) / 10;
  }

  getStockoutProducts(period: string): ForecastAccuracyRecord[] {
    return this.records.filter(r => r.period === period && r.stockoutOccurred);
  }

  getTotalInventoryCost(period: string): number {
    return this.records.filter(r => r.period === period).reduce((s, r) => s + r.overStockCostUSD + r.understockCostUSD, 0);
  }
}

export const demandForecaster = new DemandForecaster();
export const demandSensor = new DemandSensor();
export const seasonalPatternAnalyzer = new SeasonalPatternAnalyzer();
export const forecastAccuracyTracker = new ForecastAccuracyTracker();

export { DemandForecastRecord, DemandSensingRecord, SeasonalPatternRecord, ForecastAccuracyRecord };
