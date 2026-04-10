/**
 * Phase 141: Observability & Cost Management
 * Metrics aggregation, cost analysis, and resource optimization recommendations
 */

import { logger } from './logger';

interface MetricDatapoint {
  timestamp: number;
  value: number;
  labels: Record<string, string>;
}

interface ServiceCost {
  serviceName: string;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  networkCost: number;
  totalCost: number;
}

interface ResourceRecommendation {
  serviceName: string;
  currentCpu: number;
  recommendedCpu: number;
  currentMemory: number;
  recommendedMemory: number;
  potentialSavings: number;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  duration: number;
  severity: 'info' | 'warning' | 'critical';
}

class MetricsAggregator {
  private metrics: Map<string, MetricDatapoint[]> = new Map();
  private counter = 0;

  recordMetric(metricName: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${metricName}:${JSON.stringify(labels)}`;
    const datapoint: MetricDatapoint = {
      timestamp: Date.now(),
      value,
      labels
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const series = this.metrics.get(key)!;
    series.push(datapoint);

    // Keep last 30 days of data (10,080 minutes)
    if (series.length > 10080) {
      series.shift();
    }

    logger.debug('Metric recorded', { metric: metricName, value });
  }

  queryMetrics(
    metricName: string,
    labels?: Record<string, string>,
    duration: number = 3600
  ): Array<{ timestamp: number; value: number }> {
    const cutoff = Date.now() - duration * 1000;
    const results: Array<{ timestamp: number; value: number }> = [];

    for (const [key, series] of this.metrics.entries()) {
      if (!key.startsWith(metricName)) continue;

      if (labels) {
        const rawLabels = key.slice(metricName.length + 1);
        const seriesLabels = JSON.parse(rawLabels || '{}');
        if (!Object.entries(labels).every(([k, v]) => seriesLabels[k] === v)) continue;
      }

      for (const dp of series) {
        if (dp.timestamp > cutoff) {
          results.push({ timestamp: dp.timestamp, value: dp.value });
        }
      }
    }

    return results;
  }

  getAggregation(metricName: string, type: 'sum' | 'avg' | 'min' | 'max', duration: number = 3600): number {
    const datapoints = this.queryMetrics(metricName, {}, duration);

    if (datapoints.length === 0) return 0;

    const values = datapoints.map(dp => dp.value);

    switch (type) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
    }
  }
}

class CostAnalyzer {
  private costs: Map<string, ServiceCost[]> = new Map();
  private monthlyRates = {
    cpuPerCore: 100, // $/month per CPU core
    memoryPerGB: 25, // $/month per GB
    storagePerGB: 0.1, // $/month per GB
    networkPerGB: 0.02 // $/GB transferred
  };

  recordCost(serviceName: string, cpu: number, memory: number, storage: number, network: number): ServiceCost {
    const cost: ServiceCost = {
      serviceName,
      cpuCost: cpu * this.monthlyRates.cpuPerCore,
      memoryCost: memory * this.monthlyRates.memoryPerGB,
      storageCost: storage * this.monthlyRates.storagePerGB,
      networkCost: network * this.monthlyRates.networkPerGB,
      totalCost: 0
    };

    cost.totalCost = cost.cpuCost + cost.memoryCost + cost.storageCost + cost.networkCost;

    if (!this.costs.has(serviceName)) {
      this.costs.set(serviceName, []);
    }

    this.costs.get(serviceName)!.push(cost);

    logger.debug('Cost recorded', { service: serviceName, total: cost.totalCost.toFixed(2) });

    return cost;
  }

  getServiceCost(serviceName: string, month?: string): ServiceCost | null {
    const costHistory = this.costs.get(serviceName);
    if (!costHistory || costHistory.length === 0) return null;

    return costHistory[costHistory.length - 1];
  }

  getMonthlyReport(): Array<{ service: string; totalCost: number; trends: number }> {
    const report: Array<{ service: string; totalCost: number; trends: number }> = [];

    for (const [service, costs] of this.costs.entries()) {
      const currentCost = costs[costs.length - 1]?.totalCost || 0;
      const previousCost = costs[costs.length - 2]?.totalCost || currentCost;
      const trend = ((currentCost - previousCost) / (previousCost || 1)) * 100;

      report.push({ service, totalCost: currentCost, trends: trend });
    }

    return report.sort((a, b) => b.totalCost - a.totalCost);
  }

  getCostForecast(serviceName: string, months: number = 12): number {
    const costHistory = this.costs.get(serviceName) || [];
    if (costHistory.length < 2) return 0;

    const latestCost = costHistory[costHistory.length - 1].totalCost;
    const previousCost = costHistory[costHistory.length - 2].totalCost;
    const monthlyGrowth = (latestCost - previousCost) / (previousCost || 1);

    let forecast = latestCost;
    for (let i = 0; i < months; i++) {
      forecast *= 1 + monthlyGrowth;
    }

    return forecast;
  }
}

class ResourceOptimizer {
  private recommendations: Map<string, ResourceRecommendation> = new Map();
  private counter = 0;

  analyzeService(serviceName: string, currentCpu: number = 4, currentMemory: number = 8192): ResourceRecommendation {
    // Simulate analysis: typically CPU/memory usage is 20-30% of requests
    const recommendedCpu = Math.max(0.5, currentCpu * 0.3);
    const recommendedMemory = Math.max(256, currentMemory * 0.35);

    const potentialSavings = (currentCpu - recommendedCpu) * 100 + (currentMemory / 1024 - recommendedMemory / 1024) * 25;

    const recommendation: ResourceRecommendation = {
      serviceName,
      currentCpu,
      recommendedCpu,
      currentMemory,
      recommendedMemory,
      potentialSavings
    };

    this.recommendations.set(serviceName, recommendation);

    logger.debug('Resource analysis completed', {
      service: serviceName,
      savings: potentialSavings.toFixed(2)
    });

    return recommendation;
  }

  getRecommendation(serviceName: string): ResourceRecommendation | undefined {
    return this.recommendations.get(serviceName);
  }

  getAllRecommendations(): ResourceRecommendation[] {
    return Array.from(this.recommendations.values()).sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  estimateWaste(): { totalWaste: number; serviceCount: number } {
    let totalWaste = 0;

    for (const rec of this.recommendations.values()) {
      totalWaste += rec.potentialSavings;
    }

    return { totalWaste, serviceCount: this.recommendations.size };
  }
}

class AlertingEngine {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Array<{ rule: string; timestamp: number; value: number }> = [];
  private counter = 0;

  createRule(config: {
    name: string;
    metric: string;
    threshold: number;
    duration: number;
    severity: 'info' | 'warning' | 'critical';
  }): AlertRule {
    const rule: AlertRule = {
      id: `rule-${Date.now()}-${++this.counter}`,
      ...config
    };

    this.rules.set(rule.id, rule);
    logger.debug('Alert rule created', { name: config.name, threshold: config.threshold });

    return rule;
  }

  evaluateMetric(metricName: string, value: number): Array<{ ruleId: string; ruleName: string; triggered: boolean }> {
    const triggered: Array<{ ruleId: string; ruleName: string; triggered: boolean }> = [];

    for (const [id, rule] of this.rules.entries()) {
      const isTrigger = rule.metric === metricName && value > rule.threshold;

      triggered.push({ ruleId: id, ruleName: rule.name, triggered: isTrigger });

      if (isTrigger) {
        this.alerts.push({ rule: id, timestamp: Date.now(), value });
        logger.warn('Alert triggered', {
          rule: rule.name,
          metric: metricName,
          value,
          threshold: rule.threshold
        });
      }
    }

    return triggered;
  }

  getAlerts(since?: number, limit: number = 100): Array<{ rule: string; timestamp: number; value: number }> {
    return this.alerts
      .filter(a => !since || a.timestamp > since)
      .slice(-limit);
  }

  getAlertStats(): { totalAlerts: number; byRule: Record<string, number>; criticalCount: number } {
    const byRule: Record<string, number> = {};
    let criticalCount = 0;

    for (const alert of this.alerts) {
      const rule = this.rules.get(alert.rule);
      if (rule) {
        byRule[rule.name] = (byRule[rule.name] || 0) + 1;
        if (rule.severity === 'critical') criticalCount++;
      }
    }

    return { totalAlerts: this.alerts.length, byRule, criticalCount };
  }
}

export const metricsAggregator = new MetricsAggregator();
export const costAnalyzer = new CostAnalyzer();
export const resourceOptimizer = new ResourceOptimizer();
export const alertingEngine = new AlertingEngine();

export { MetricDatapoint, ServiceCost, ResourceRecommendation, AlertRule };
