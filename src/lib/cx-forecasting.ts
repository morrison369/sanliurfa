/**
 * Phase 220: CX Forecasting
 * CX metric forecasting, churn risk prediction, customer value forecasting, experience impact modeling
 */

import { logger } from './logger';

interface CXMetricForecast {
  forecastId: string;
  metric: string;
  currentValue: number;
  forecastedValue: number;
  forecastHorizonDays: number;
  confidence: number;  // 0-1
  trend: 'improving' | 'stable' | 'declining';
  forecastedAt: number;
}

interface ChurnRiskProfile {
  riskId: string;
  customerId: string;
  churnProbability: number;  // 0-1
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: Array<{ factor: string; weight: number }>;
  predictedChurnDate?: number;
  retentionActions: string[];
  calculatedAt: number;
}

interface CustomerValueForecast {
  valueForecastId: string;
  customerId: string;
  currentAnnualValue: number;
  forecastedAnnualValue: number;
  forecastHorizonMonths: number;
  growthRate: number;  // percentage
  scenario: 'optimistic' | 'base' | 'pessimistic';
  forecastedAt: number;
}

interface ExperienceImpactModel {
  modelId: string;
  experienceChange: string;
  metricAffected: string;
  estimatedImpactPct: number;
  confidenceInterval: { low: number; high: number };
  sampleSize: number;
  modelledAt: number;
}

class CXMetricForecaster {
  private forecasts: Map<string, CXMetricForecast[]> = new Map();
  private historicalData: Map<string, number[]> = new Map();
  private counter = 0;

  recordDataPoint(metric: string, value: number): void {
    const history = this.historicalData.get(metric) || [];
    history.push(value);
    this.historicalData.set(metric, history);
  }

  forecast(metric: string, horizonDays: number): CXMetricForecast {
    const history = this.historicalData.get(metric) || [];
    const currentValue = history.length > 0 ? history[history.length - 1] : 0;
    let forecastedValue = currentValue;
    let trend: CXMetricForecast['trend'] = 'stable';

    if (history.length >= 3) {
      const recentAvg = history.slice(-3).reduce((s, v) => s + v, 0) / 3;
      const olderAvg = history.slice(-6, -3).reduce((s, v) => s + v, 0) / Math.max(history.slice(-6, -3).length, 1);
      const momentum = recentAvg - olderAvg;
      const dailyChange = momentum / 90;
      forecastedValue = currentValue + dailyChange * horizonDays;
      trend = momentum > 1 ? 'improving' : momentum < -1 ? 'declining' : 'stable';
    }

    const confidence = Math.min(0.95, 0.5 + history.length * 0.05);
    const forecastId = `cxfcast-${Date.now()}-${++this.counter}`;
    const forecast: CXMetricForecast = {
      forecastId, metric, currentValue,
      forecastedValue: Math.max(0, forecastedValue),
      forecastHorizonDays: horizonDays, confidence, trend, forecastedAt: Date.now()
    };
    const existing = this.forecasts.get(metric) || [];
    existing.push(forecast);
    this.forecasts.set(metric, existing);
    logger.debug('CX metric forecasted', { metric, currentValue, forecastedValue, trend });
    return forecast;
  }

  getLatestForecast(metric: string): CXMetricForecast | undefined {
    const history = this.forecasts.get(metric) || [];
    return history[history.length - 1];
  }

  getDecliningMetrics(): CXMetricForecast[] {
    return Array.from(this.forecasts.values())
      .map(h => h[h.length - 1])
      .filter((f): f is CXMetricForecast => !!f && f.trend === 'declining');
  }
}

class ChurnRiskPredictor {
  private profiles: Map<string, ChurnRiskProfile> = new Map();
  private counter = 0;

  predict(customerId: string, signals: Array<{ factor: string; score: number; weight: number }>): ChurnRiskProfile {
    const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
    const weightedScore = totalWeight > 0
      ? signals.reduce((s, sig) => s + sig.score * sig.weight, 0) / totalWeight
      : 0;

    const churnProbability = Math.max(0, Math.min(1, weightedScore / 100));
    const riskLevel: ChurnRiskProfile['riskLevel'] =
      churnProbability >= 0.75 ? 'critical' :
      churnProbability >= 0.5 ? 'high' :
      churnProbability >= 0.25 ? 'medium' : 'low';

    const retentionActions: string[] = [];
    if (churnProbability >= 0.75) retentionActions.push('immediate_outreach', 'executive_escalation');
    else if (churnProbability >= 0.5) retentionActions.push('proactive_csm_contact', 'discount_offer');
    else if (churnProbability >= 0.25) retentionActions.push('health_check', 'feature_adoption_campaign');

    const riskId = `churnrisk-${Date.now()}-${++this.counter}`;
    const profile: ChurnRiskProfile = {
      riskId, customerId, churnProbability, riskLevel,
      riskFactors: signals.map(s => ({ factor: s.factor, weight: s.weight })),
      retentionActions, calculatedAt: Date.now()
    };
    this.profiles.set(customerId, profile);
    logger.debug('Churn risk predicted', { customerId, churnProbability, riskLevel });
    return profile;
  }

  getHighRiskCustomers(threshold: ChurnRiskProfile['riskLevel'] = 'high'): ChurnRiskProfile[] {
    const levels: ChurnRiskProfile['riskLevel'][] = ['critical', 'high', 'medium', 'low'];
    const minIdx = levels.indexOf(threshold);
    return Array.from(this.profiles.values())
      .filter(p => levels.indexOf(p.riskLevel) <= minIdx)
      .sort((a, b) => b.churnProbability - a.churnProbability);
  }

  getProfile(customerId: string): ChurnRiskProfile | undefined {
    return this.profiles.get(customerId);
  }

  getAvgChurnProbability(): number {
    const all = Array.from(this.profiles.values());
    if (!all.length) return 0;
    return all.reduce((s, p) => s + p.churnProbability, 0) / all.length;
  }
}

class CustomerValueForecaster {
  private forecasts: Map<string, CustomerValueForecast[]> = new Map();
  private counter = 0;

  forecast(customerId: string, currentAnnualValue: number, growthSignals: number[], horizonMonths: number): CustomerValueForecast[] {
    const avgSignal = growthSignals.length > 0
      ? growthSignals.reduce((s, v) => s + v, 0) / growthSignals.length
      : 0;

    const scenarios: Array<{ scenario: CustomerValueForecast['scenario']; multiplier: number }> = [
      { scenario: 'optimistic', multiplier: 1.3 },
      { scenario: 'base', multiplier: 1.0 },
      { scenario: 'pessimistic', multiplier: 0.7 }
    ];

    const results: CustomerValueForecast[] = [];
    for (const { scenario, multiplier } of scenarios) {
      const adjustedGrowth = avgSignal * multiplier;
      const monthlyGrowth = adjustedGrowth / 12 / 100;
      const forecastedAnnualValue = currentAnnualValue * Math.pow(1 + monthlyGrowth, horizonMonths);
      const valueForecastId = `valfcast-${Date.now()}-${++this.counter}`;
      const forecast: CustomerValueForecast = {
        valueForecastId, customerId, currentAnnualValue,
        forecastedAnnualValue: Math.max(0, forecastedAnnualValue),
        forecastHorizonMonths: horizonMonths,
        growthRate: adjustedGrowth, scenario, forecastedAt: Date.now()
      };
      results.push(forecast);
    }

    this.forecasts.set(customerId, results);
    return results;
  }

  getBaseForecast(customerId: string): CustomerValueForecast | undefined {
    return this.forecasts.get(customerId)?.find(f => f.scenario === 'base');
  }

  getTopGrowthCustomers(limit = 10): CustomerValueForecast[] {
    return Array.from(this.forecasts.values())
      .map(forecasts => forecasts.find(f => f.scenario === 'base'))
      .filter((f): f is CustomerValueForecast => !!f)
      .sort((a, b) => b.forecastedAnnualValue - a.forecastedAnnualValue)
      .slice(0, limit);
  }
}

class ExperienceImpactModeler {
  private models: Map<string, ExperienceImpactModel> = new Map();
  private counter = 0;

  model(experienceChange: string, metricAffected: string, observedImpacts: number[]): ExperienceImpactModel {
    if (!observedImpacts.length) {
      const modelId = `expmodel-${Date.now()}-${++this.counter}`;
      const empty: ExperienceImpactModel = {
        modelId, experienceChange, metricAffected,
        estimatedImpactPct: 0, confidenceInterval: { low: 0, high: 0 },
        sampleSize: 0, modelledAt: Date.now()
      };
      this.models.set(`${experienceChange}:${metricAffected}`, empty);
      return empty;
    }

    const avg = observedImpacts.reduce((s, v) => s + v, 0) / observedImpacts.length;
    const variance = observedImpacts.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / observedImpacts.length;
    const stdDev = Math.sqrt(variance);
    const marginOfError = 1.96 * stdDev / Math.sqrt(observedImpacts.length);

    const modelId = `expmodel-${Date.now()}-${++this.counter}`;
    const model: ExperienceImpactModel = {
      modelId, experienceChange, metricAffected,
      estimatedImpactPct: avg,
      confidenceInterval: { low: avg - marginOfError, high: avg + marginOfError },
      sampleSize: observedImpacts.length, modelledAt: Date.now()
    };
    this.models.set(`${experienceChange}:${metricAffected}`, model);
    logger.debug('Experience impact modelled', { experienceChange, metricAffected, estimatedImpactPct: avg });
    return model;
  }

  getModel(experienceChange: string, metricAffected: string): ExperienceImpactModel | undefined {
    return this.models.get(`${experienceChange}:${metricAffected}`);
  }

  getHighImpactChanges(threshold = 10): ExperienceImpactModel[] {
    return Array.from(this.models.values())
      .filter(m => Math.abs(m.estimatedImpactPct) >= threshold)
      .sort((a, b) => Math.abs(b.estimatedImpactPct) - Math.abs(a.estimatedImpactPct));
  }

  getAllModels(): ExperienceImpactModel[] {
    return Array.from(this.models.values());
  }
}

export const cxMetricForecaster = new CXMetricForecaster();
export const churnRiskPredictor = new ChurnRiskPredictor();
export const customerValueForecaster = new CustomerValueForecaster();
export const experienceImpactModeler = new ExperienceImpactModeler();

export { CXMetricForecast, ChurnRiskProfile, CustomerValueForecast, ExperienceImpactModel };
