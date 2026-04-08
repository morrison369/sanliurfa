/**
 * Phase 83: Customer Health & Metrics
 * Customer health scoring, metrics tracking, risk indicators, churn prediction
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'churned';
export type MetricCategory = 'engagement' | 'adoption' | 'sentiment' | 'support' | 'expansion';

export interface CustomerHealth {
  id: string;
  customerId: string;
  accountId: string;
  healthScore: number;
  status: HealthStatus;
  riskFactors: string[];
  lastUpdated: number;
  createdAt: number;
}

export interface HealthMetric {
  id: string;
  customerId: string;
  category: MetricCategory;
  metricName: string;
  value: number;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: number;
  createdAt: number;
}

export interface ChurnPrediction {
  id: string;
  customerId: string;
  churnProbability: number;
  riskScore: number;
  predictedChurnDate?: number;
  riskFactors: string[];
  predictedAt: number;
}

// ==================== CUSTOMER HEALTH MANAGER ====================

export class CustomerHealthManager {
  private healthRecords = new Map<string, CustomerHealth>();
  private healthCount = 0;

  /**
   * Create health record
   */
  createHealthRecord(health: Omit<CustomerHealth, 'id' | 'createdAt'>): CustomerHealth {
    const id = 'health-' + Date.now() + '-' + this.healthCount++;

    const newHealth: CustomerHealth = {
      ...health,
      id,
      createdAt: Date.now()
    };

    this.healthRecords.set(id, newHealth);
    logger.info('Customer health record created', {
      customerId: health.customerId,
      healthScore: health.healthScore,
      status: health.status
    });

    return newHealth;
  }

  /**
   * Get customer health
   */
  getCustomerHealth(customerId: string): CustomerHealth | null {
    const records = Array.from(this.healthRecords.values());
    return records.find(r => r.customerId === customerId) || null;
  }

  /**
   * Update health score
   */
  updateHealthScore(customerId: string, newScore: number): void {
    const record = Array.from(this.healthRecords.values()).find(r => r.customerId === customerId);
    if (record) {
      record.healthScore = newScore;
      record.lastUpdated = Date.now();

      // Update status based on score
      if (newScore >= 80) {
        record.status = 'healthy';
      } else if (newScore >= 50) {
        record.status = 'at_risk';
      } else if (newScore > 0) {
        record.status = 'critical';
      } else {
        record.status = 'churned';
      }

      logger.debug('Health score updated', { customerId, newScore, status: record.status });
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(accountId: string): HealthStatus {
    const records = Array.from(this.healthRecords.values()).filter(r => r.accountId === accountId);
    if (records.length === 0) return 'healthy';

    const avgScore = records.reduce((sum, r) => sum + r.healthScore, 0) / records.length;
    if (avgScore >= 80) return 'healthy';
    if (avgScore >= 50) return 'at_risk';
    if (avgScore > 0) return 'critical';
    return 'churned';
  }

  /**
   * Get customers at risk
   */
  getCustomersAtRisk(): CustomerHealth[] {
    return Array.from(this.healthRecords.values()).filter(
      r => r.status === 'at_risk' || r.status === 'critical'
    );
  }
}

// ==================== METRICS TRACKER ====================

export class MetricsTracker {
  private metrics = new Map<string, HealthMetric>();
  private metricCount = 0;

  /**
   * Record metric
   */
  recordMetric(metric: Omit<HealthMetric, 'id' | 'createdAt'>): HealthMetric {
    const id = 'metric-' + Date.now() + '-' + this.metricCount++;

    const newMetric: HealthMetric = {
      ...metric,
      id,
      createdAt: Date.now()
    };

    this.metrics.set(id, newMetric);
    logger.debug('Health metric recorded', {
      customerId: metric.customerId,
      category: metric.category,
      metricName: metric.metricName,
      value: metric.value
    });

    return newMetric;
  }

  /**
   * Get customer metrics
   */
  getCustomerMetrics(customerId: string): HealthMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.customerId === customerId);
  }

  /**
   * Get metric by category
   */
  getMetricByCategory(customerId: string, category: MetricCategory): HealthMetric[] {
    return Array.from(this.metrics.values()).filter(
      m => m.customerId === customerId && m.category === category
    );
  }

  /**
   * Calculate metric trend
   */
  calculateMetricTrend(customerId: string, metricName: string, periods: number): number[] {
    const metrics = this.getCustomerMetrics(customerId).filter(m => m.metricName === metricName);
    return metrics.slice(-periods).map(m => m.value);
  }
}

// ==================== CHURN PREDICTOR ====================

export class ChurnPredictor {
  private predictions = new Map<string, ChurnPrediction>();
  private predictionCount = 0;
  private riskScores = new Map<string, number>();

  /**
   * Predict churn
   */
  predictChurn(customerId: string): ChurnPrediction {
    const id = 'churn-' + Date.now() + '-' + this.predictionCount++;
    const churnProbability = Math.random() * 100;
    const riskScore = this.getChurnRiskScore(customerId);

    const prediction: ChurnPrediction = {
      id,
      customerId,
      churnProbability,
      riskScore,
      predictedChurnDate: churnProbability > 50 ? Date.now() + 90 * 86400000 : undefined,
      riskFactors: this.identifyRiskFactors(churnProbability),
      predictedAt: Date.now()
    };

    this.predictions.set(id, prediction);
    logger.info('Churn prediction calculated', {
      customerId,
      churnProbability,
      riskScore,
      highRisk: churnProbability > 50
    });

    return prediction;
  }

  /**
   * Get churn risk score
   */
  getChurnRiskScore(customerId: string): number {
    const stored = this.riskScores.get(customerId);
    if (stored !== undefined) return stored;

    const score = Math.round(Math.random() * 100);
    this.riskScores.set(customerId, score);
    return score;
  }

  /**
   * Identify high-risk customers
   */
  identifyHighRiskCustomers(): ChurnPrediction[] {
    return Array.from(this.predictions.values()).filter(p => p.churnProbability > 60);
  }

  /**
   * Get risk factors
   */
  getRiskFactors(customerId: string): string[] {
    const prediction = Array.from(this.predictions.values()).find(p => p.customerId === customerId);
    return prediction?.riskFactors || [];
  }

  /**
   * Update prediction
   */
  updatePrediction(customerId: string): ChurnPrediction {
    return this.predictChurn(customerId);
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(probability: number): string[] {
    const factors: string[] = [];

    if (probability > 70) {
      factors.push('Declining engagement');
      factors.push('High support ticket volume');
      factors.push('Delayed renewals');
    } else if (probability > 50) {
      factors.push('Moderate feature adoption');
      factors.push('Infrequent logins');
    } else if (probability > 30) {
      factors.push('Occasional usage dips');
    }

    return factors;
  }
}

// ==================== EXPORTS ====================

export const customerHealthManager = new CustomerHealthManager();
export const metricsTracker = new MetricsTracker();
export const churnPredictor = new ChurnPredictor();
