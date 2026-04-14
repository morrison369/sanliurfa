/**
 * Phase 201: Strategic Compliance Forecasting
 */

import { logger } from '../logger';

class ForecastModelManager {
  project(series: number[], horizon: number): number[] {
    if (series.length === 0) return [];
    const last = series[series.length - 1];
    const trend = series.length > 1 ? (series[series.length - 1] - series[0]) / (series.length - 1) : 0;
    return Array.from({ length: horizon }, (_, i) => Math.round((last + trend * (i + 1)) * 10) / 10);
  }
}

class ForecastUncertaintyEstimator {
  interval(forecast: number[], confidence = 0.9): Array<{ low: number; high: number }> {
    const margin = confidence >= 0.9 ? 5 : 8;
    return forecast.map(v => ({ low: Math.max(0, v - margin), high: v + margin }));
  }
}

class StrategicRiskProjector {
  projectRisk(forecast: number[]): 'low' | 'medium' | 'high' {
    const avg = forecast.length ? forecast.reduce((a, b) => a + b, 0) / forecast.length : 0;
    if (avg >= 85) return 'low';
    if (avg >= 70) return 'medium';
    return 'high';
  }
}

class ForecastDecisionAid {
  recommend(risk: 'low' | 'medium' | 'high'): string {
    const recommendation =
      risk === 'low' ? 'maintain strategic trajectory' :
      risk === 'medium' ? 'increase control investment' :
      'trigger accelerated remediation program';
    logger.debug('Forecast decision recommendation', { risk });
    return recommendation;
  }
}

export const forecastModelManager = new ForecastModelManager();
export const forecastUncertaintyEstimator = new ForecastUncertaintyEstimator();
export const strategicRiskProjector = new StrategicRiskProjector();
export const forecastDecisionAid = new ForecastDecisionAid();

export {
  ForecastModelManager,
  ForecastUncertaintyEstimator,
  StrategicRiskProjector,
  ForecastDecisionAid
};


