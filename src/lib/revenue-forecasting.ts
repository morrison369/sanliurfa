/**
 * Phase 194: Revenue Forecasting
 * Revenue forecasting, pipeline calculation, seasonality analysis, forecast accuracy tracking
 */

import { logger } from './logger';

interface RevenueForecast {
  forecastId: string;
  period: string;
  model: 'linear' | 'exponential' | 'seasonal' | 'pipeline_weighted';
  predictedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  assumptions: Record<string, number>;
  createdAt: number;
}

interface PipelineItem {
  itemId: string;
  dealName: string;
  value: number;
  stage: string;
  probability: number; // 0-1
  expectedCloseDate: number;
  ownerId: string;
}

interface SeasonalityPattern {
  patternId: string;
  name: string;
  monthlyFactors: number[]; // 12 factors, multipliers relative to avg
  calculatedAt: number;
}

interface ForecastAccuracy {
  accuracyId: string;
  forecastId: string;
  period: string;
  predictedRevenue: number;
  actualRevenue: number;
  errorPct: number;
  mape: number; // Mean Absolute Percentage Error
  recordedAt: number;
}

class RevenueForecaster {
  private historicalData: Map<string, number> = new Map(); // period -> revenue
  private forecasts: Map<string, RevenueForecast> = new Map();
  private counter = 0;

  recordActual(period: string, revenue: number): void {
    this.historicalData.set(period, revenue);
  }

  forecastLinear(targetPeriod: string, periodsAhead = 1): RevenueForecast {
    const data = Array.from(this.historicalData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (data.length < 2) {
      const last = data[data.length - 1]?.[1] || 0;
      return this._createForecast(targetPeriod, 'linear', last, last * 0.9, last * 1.1, {});
    }
    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((s, [, v]) => s + v, 0) / n;
    const slope = data.reduce((s, [, v], i) => s + (i - xMean) * (v - yMean), 0) /
      data.reduce((s, _, i) => s + Math.pow(i - xMean, 2), 0);
    const intercept = yMean - slope * xMean;
    const predicted = intercept + slope * (n - 1 + periodsAhead);
    const residuals = data.map(([, v], i) => Math.abs(v - (intercept + slope * i)));
    const avgResidual = residuals.reduce((s, v) => s + v, 0) / residuals.length;
    return this._createForecast(targetPeriod, 'linear', predicted, predicted - avgResidual, predicted + avgResidual, { slope, intercept });
  }

  forecastExponential(targetPeriod: string, alpha = 0.3): RevenueForecast {
    const data = Array.from(this.historicalData.values());
    if (!data.length) return this._createForecast(targetPeriod, 'exponential', 0, 0, 0, { alpha });
    let smoothed = data[0];
    for (let i = 1; i < data.length; i++) smoothed = alpha * data[i] + (1 - alpha) * smoothed;
    const variance = data.reduce((s, v) => s + Math.pow(v - smoothed, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    return this._createForecast(targetPeriod, 'exponential', smoothed, smoothed - stdDev, smoothed + stdDev, { alpha, smoothed });
  }

  private _createForecast(period: string, model: RevenueForecast['model'], predicted: number, low: number, high: number, assumptions: Record<string, number>): RevenueForecast {
    const forecastId = `forecast-${Date.now()}-${++this.counter}`;
    const forecast: RevenueForecast = {
      forecastId, period, model,
      predictedRevenue: Math.max(0, predicted),
      confidenceLow: Math.max(0, low),
      confidenceHigh: Math.max(0, high),
      assumptions, createdAt: Date.now()
    };
    this.forecasts.set(forecastId, forecast);
    logger.debug('Revenue forecast created', { forecastId, period, model, predicted: predicted.toFixed(2) });
    return forecast;
  }

  getForecasts(): RevenueForecast[] {
    return Array.from(this.forecasts.values());
  }
}

class PipelineRevenueCalculator {
  private items: Map<string, PipelineItem> = new Map();
  private counter = 0;

  addItem(dealName: string, value: number, stage: string, probability: number, expectedCloseDays: number, ownerId: string): PipelineItem {
    const itemId = `pipeline-${Date.now()}-${++this.counter}`;
    const item: PipelineItem = {
      itemId, dealName, value, stage,
      probability: Math.max(0, Math.min(1, probability)),
      expectedCloseDate: Date.now() + expectedCloseDays * 86400000,
      ownerId
    };
    this.items.set(itemId, item);
    return item;
  }

  calculateWeightedRevenue(): number {
    return Array.from(this.items.values()).reduce((sum, item) => sum + item.value * item.probability, 0);
  }

  calculateByStage(): Record<string, { count: number; totalValue: number; weightedValue: number }> {
    const result: Record<string, { count: number; totalValue: number; weightedValue: number }> = {};
    for (const item of this.items.values()) {
      if (!result[item.stage]) result[item.stage] = { count: 0, totalValue: 0, weightedValue: 0 };
      result[item.stage].count++;
      result[item.stage].totalValue += item.value;
      result[item.stage].weightedValue += item.value * item.probability;
    }
    return result;
  }

  forecastByPeriod(daysAhead: number): number {
    const cutoff = Date.now() + daysAhead * 86400000;
    return Array.from(this.items.values())
      .filter(i => i.expectedCloseDate <= cutoff)
      .reduce((sum, i) => sum + i.value * i.probability, 0);
  }

  removeItem(itemId: string): boolean {
    return this.items.delete(itemId);
  }
}

class SeasonalityAnalyzer {
  private patterns: Map<string, SeasonalityPattern> = new Map();
  private counter = 0;

  calculatePattern(name: string, monthlyRevenues: number[]): SeasonalityPattern {
    if (monthlyRevenues.length !== 12) throw new Error('Need 12 months of data');
    const avg = monthlyRevenues.reduce((s, v) => s + v, 0) / 12;
    const monthlyFactors = avg > 0 ? monthlyRevenues.map(v => v / avg) : new Array(12).fill(1);
    const patternId = `pattern-${Date.now()}-${++this.counter}`;
    const pattern: SeasonalityPattern = { patternId, name, monthlyFactors, calculatedAt: Date.now() };
    this.patterns.set(name, pattern);
    logger.debug('Seasonality pattern calculated', { patternId, name });
    return pattern;
  }

  adjustForecast(baseForecast: number, patternName: string, targetMonth: number): number {
    const pattern = this.patterns.get(patternName);
    if (!pattern) return baseForecast;
    const factor = pattern.monthlyFactors[targetMonth % 12] ?? 1;
    return baseForecast * factor;
  }

  getPeakMonth(patternName: string): number {
    const pattern = this.patterns.get(patternName);
    if (!pattern) return 0;
    const max = Math.max(...pattern.monthlyFactors);
    return pattern.monthlyFactors.indexOf(max);
  }

  getPattern(name: string): SeasonalityPattern | undefined {
    return this.patterns.get(name);
  }
}

class ForecastAccuracyTracker {
  private records: Map<string, ForecastAccuracy> = new Map();
  private counter = 0;

  record(forecastId: string, period: string, predictedRevenue: number, actualRevenue: number): ForecastAccuracy {
    const accuracyId = `accuracy-${Date.now()}-${++this.counter}`;
    const errorPct = actualRevenue > 0 ? ((predictedRevenue - actualRevenue) / actualRevenue) * 100 : 0;
    const mape = Math.abs(errorPct);
    const record: ForecastAccuracy = {
      accuracyId, forecastId, period, predictedRevenue, actualRevenue,
      errorPct, mape, recordedAt: Date.now()
    };
    this.records.set(accuracyId, record);
    logger.debug('Forecast accuracy recorded', { forecastId, period, mape: mape.toFixed(1) });
    return record;
  }

  getOverallMAPE(): number {
    const records = Array.from(this.records.values());
    if (!records.length) return 0;
    return records.reduce((s, r) => s + r.mape, 0) / records.length;
  }

  getBestModel(): string | undefined {
    const byForecast = new Map<string, number[]>();
    for (const r of this.records.values()) {
      const arr = byForecast.get(r.forecastId) || [];
      arr.push(r.mape);
      byForecast.set(r.forecastId, arr);
    }
    let best: string | undefined;
    let bestMAPE = Infinity;
    for (const [forecastId, mapes] of byForecast.entries()) {
      const avg = mapes.reduce((s, v) => s + v, 0) / mapes.length;
      if (avg < bestMAPE) { bestMAPE = avg; best = forecastId; }
    }
    return best;
  }

  getRecords(): ForecastAccuracy[] {
    return Array.from(this.records.values());
  }
}

export const revenueForecaster = new RevenueForecaster();
export const pipelineRevenueCalculator = new PipelineRevenueCalculator();
export const seasonalityAnalyzer = new SeasonalityAnalyzer();
export const forecastAccuracyTracker = new ForecastAccuracyTracker();

export { RevenueForecast, PipelineItem, SeasonalityPattern, ForecastAccuracy };
