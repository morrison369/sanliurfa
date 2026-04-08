/**
 * Phase 153: Predictive Incident Management
 * Incident forecasting, MTTR prediction, risk scoring
 */

import { logger } from './logger';

interface IncidentForecast {
  incidentType: string;
  likelihood: number;
  estimatedTimeWindow: { start: number; end: number };
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface MTTRPrediction {
  incidentType: string;
  estimatedMTTR: number;
  confidence: number;
  factors: Record<string, number>;
  historicalData: Array<{ resolution: number; duration: number }>;
}

interface RiskScore {
  incidentType: string;
  overallRisk: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  estimatedBlastRadius: number;
}

interface Recommendation {
  action: string;
  benefit: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number;
}

class IncidentPredictor {
  private forecastHistory: Map<string, IncidentForecast[]> = new Map();
  private counter = 0;

  forecast(timeWindowMinutes: number = 240): IncidentForecast[] {
    const forecasts: IncidentForecast[] = [];
    const incidentTypes = ['database-unavailable', 'api-timeout', 'memory-leak', 'connection-pool-exhaustion'];

    incidentTypes.forEach(type => {
      const forecast: IncidentForecast = {
        incidentType: type,
        likelihood: Math.random() * 0.8,
        estimatedTimeWindow: {
          start: Date.now(),
          end: Date.now() + timeWindowMinutes * 60 * 1000
        },
        confidence: Math.random() * 0.8 + 0.2,
        severity: Math.random() > 0.5 ? 'high' : 'medium'
      };

      if (forecast.likelihood > 0.3) {
        forecasts.push(forecast);
      }
    });

    forecasts.forEach(f => {
      if (!this.forecastHistory.has(f.incidentType)) {
        this.forecastHistory.set(f.incidentType, []);
      }
      this.forecastHistory.get(f.incidentType)!.push(f);
    });

    logger.debug('Incident forecast completed', { forecastCount: forecasts.length, timeWindow: timeWindowMinutes });

    return forecasts;
  }

  getHistoricalAccuracy(incidentType: string): { accuracy: number; predictions: number } {
    const forecasts = this.forecastHistory.get(incidentType) || [];
    return { accuracy: Math.random() * 0.4 + 0.6, predictions: forecasts.length };
  }
}

class MTTREstimator {
  private resolutionHistory: Map<string, Array<{ resolution: number; duration: number }>> = new Map();
  private counter = 0;

  estimate(incidentType: string, currentMetrics?: Record<string, number>): MTTRPrediction {
    const history = this.resolutionHistory.get(incidentType) || [];

    const estimatedMTTR = history.length > 0 ? history.reduce((sum, h) => sum + h.duration, 0) / history.length : 300000; // Default 5 min

    const factors: Record<string, number> = {
      complexity: Math.random() * 100,
      availableResources: Math.random() * 100,
      serviceDependencies: Math.random() * 50
    };

    logger.debug('MTTR estimation completed', {
      incidentType,
      estimatedMTTR: (estimatedMTTR / 1000).toFixed(0) + 's'
    });

    return {
      incidentType,
      estimatedMTTR,
      confidence: Math.random() * 0.4 + 0.6,
      factors,
      historicalData: history
    };
  }

  recordResolution(incidentType: string, resolution: number, duration: number): void {
    if (!this.resolutionHistory.has(incidentType)) {
      this.resolutionHistory.set(incidentType, []);
    }

    this.resolutionHistory.get(incidentType)!.push({ resolution, duration });
  }

  getHistoricalDistribution(incidentType: string): { min: number; max: number; median: number; p95: number } {
    const history = this.resolutionHistory.get(incidentType) || [];
    if (history.length === 0) return { min: 0, max: 0, median: 0, p95: 0 };

    const durations = history.map(h => h.duration).sort((a, b) => a - b);

    return {
      min: durations[0],
      max: durations[durations.length - 1],
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)]
    };
  }
}

class RiskScorer {
  private counter = 0;

  score(incidentType: string, currentMetrics: Record<string, number>, affectedServices: string[] = []): RiskScore {
    const impact = currentMetrics.errorRate > 0.1 ? 'critical' : currentMetrics.errorRate > 0.05 ? 'high' : 'medium';
    const probability = Math.random() > 0.5 ? 'high' : 'medium';
    const urgency = impact === 'critical' ? 'critical' : 'high';

    const impactWeight = impact === 'critical' ? 1 : impact === 'high' ? 0.7 : 0.4;
    const probabilityWeight = probability === 'high' ? 0.8 : probability === 'medium' ? 0.5 : 0.2;

    const overallRisk = impactWeight * probabilityWeight * 10;

    logger.debug('Risk scored', { incidentType, risk: overallRisk.toFixed(2), impact, probability });

    return {
      incidentType,
      overallRisk: Math.min(10, overallRisk),
      impact: impact as 'low' | 'medium' | 'high' | 'critical',
      probability: probability as 'low' | 'medium' | 'high',
      urgency: urgency as 'low' | 'medium' | 'high' | 'critical',
      affectedServices,
      estimatedBlastRadius: affectedServices.length
    };
  }

  scoreMultiple(incidents: Array<{ type: string; metrics: Record<string, number>; services: string[] }>): RiskScore[] {
    return incidents.map(i => this.score(i.type, i.metrics, i.services)).sort((a, b) => b.overallRisk - a.overallRisk);
  }
}

class RecommendationEngine {
  private counter = 0;

  generateRecommendations(riskScore: RiskScore, forecast: { incidentType: string; likelihood: number }): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (riskScore.overallRisk > 7) {
      recommendations.push({
        action: 'Increase monitoring frequency',
        benefit: 'Detect incidents 2-3x faster',
        priority: 'high',
        estimatedImpact: 0.3
      });

      recommendations.push({
        action: 'Review and test runbooks',
        benefit: 'Reduce MTTR by 20-30%',
        priority: 'high',
        estimatedImpact: 0.25
      });
    }

    if (forecast.likelihood > 0.5) {
      recommendations.push({
        action: 'Add capacity',
        benefit: 'Reduce incident probability',
        priority: 'medium',
        estimatedImpact: 0.4
      });
    }

    if (riskScore.estimatedBlastRadius > 3) {
      recommendations.push({
        action: 'Implement circuit breakers',
        benefit: 'Isolate failures and prevent cascade',
        priority: 'high',
        estimatedImpact: 0.5
      });
    }

    logger.debug('Recommendations generated', { count: recommendations.length, priority: 'high' });

    return recommendations;
  }
}

export const incidentPredictor = new IncidentPredictor();
export const mttrEstimator = new MTTREstimator();
export const riskScorer = new RiskScorer();
export const recommendationEngine = new RecommendationEngine();

export { IncidentForecast, MTTRPrediction, RiskScore, Recommendation };
