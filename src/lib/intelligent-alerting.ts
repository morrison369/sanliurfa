/**
 * Phase 152: Intelligent Alerting System
 * Smart alert routing, correlation, deduplication, dynamic thresholds
 */

import { logger } from './logger';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold?: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  enabled: boolean;
  routingTargets: string[];
}

interface Alert {
  alertId: string;
  ruleId: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  context: Record<string, any>;
  status: 'firing' | 'resolved';
}

interface AlertRoute {
  target: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  escalationLevel: number;
}

interface DynamicThreshold {
  metric: string;
  baselineValue: number;
  deviationPercent: number;
  calculatedThreshold: number;
  lastUpdated: number;
}

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private counter = 0;

  createRule(config: Omit<AlertRule, 'id'>): AlertRule {
    const rule: AlertRule = {
      id: `rule-${Date.now()}-${++this.counter}`,
      ...config
    };

    this.rules.set(rule.id, rule);

    logger.debug('Alert rule created', { ruleId: rule.id, name: config.name });

    return rule;
  }

  fireAlert(ruleId: string, context: Record<string, any>): Alert {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    const alert: Alert = {
      alertId: `alert-${Date.now()}-${++this.counter}`,
      ruleId,
      timestamp: Date.now(),
      severity: rule.severity,
      title: rule.name,
      description: `Alert triggered: ${rule.name}`,
      context,
      status: 'firing'
    };

    this.activeAlerts.set(alert.alertId, alert);

    logger.debug('Alert fired', { alertId: alert.alertId, severity: alert.severity });

    return alert;
  }

  resolveAlert(alertId: string): Alert | undefined {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      logger.debug('Alert resolved', { alertId });
    }

    return alert;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => a.status === 'firing');
  }

  evaluateAllRules(metrics: Record<string, number>): Alert[] {
    const newAlerts: Alert[] = [];

    this.rules.forEach(rule => {
      if (rule.enabled && metrics[rule.name.toLowerCase()] !== undefined) {
        const metricValue = metrics[rule.name.toLowerCase()];

        if (rule.threshold && metricValue > rule.threshold) {
          newAlerts.push(this.fireAlert(rule.id, { metricValue, threshold: rule.threshold }));
        }
      }
    });

    return newAlerts;
  }
}

class AlertRouter {
  private routes: Map<string, AlertRoute> = new Map();
  private counter = 0;

  registerRoute(target: string, route: AlertRoute): void {
    this.routes.set(target, route);

    logger.debug('Alert route registered', { target, type: route.type });
  }

  routeAlert(alert: Alert): { routes: AlertRoute[]; enrichedAlert: Alert } {
    const rule = this.routes.get(`rule-${alert.ruleId}`);
    const routes = Array.from(this.routes.values()).filter(r => r.escalationLevel <= alert.severity.length);

    logger.debug('Alert routed', { alertId: alert.alertId, routeCount: routes.length });

    return { routes, enrichedAlert: alert };
  }

  enrichAlert(alert: Alert, enrichment: { relatedMetrics?: Record<string, number>; traces?: string[]; logs?: string[] }): Alert {
    return {
      ...alert,
      context: {
        ...alert.context,
        ...enrichment
      }
    };
  }

  getAvailableRoutes(): AlertRoute[] {
    return Array.from(this.routes.values());
  }
}

class AlertDeduplicator {
  private recentAlerts: Map<string, Alert> = new Map();
  private counter = 0;

  deduplicate(alerts: Alert[], windowMinutes: number = 5): Alert[] {
    const cutoffTime = Date.now() - windowMinutes * 60 * 1000;
    const deduped: Alert[] = [];

    alerts.forEach(alert => {
      const key = `${alert.ruleId}-${alert.severity}`;

      const existing = Array.from(this.recentAlerts.values()).find(a => {
        const alertKey = `${a.ruleId}-${a.severity}`;
        return alertKey === key && a.timestamp > cutoffTime;
      });

      if (!existing) {
        deduped.push(alert);
        this.recentAlerts.set(alert.alertId, alert);
      }
    });

    // Cleanup old entries
    Array.from(this.recentAlerts.entries()).forEach(([id, alert]) => {
      if (alert.timestamp < cutoffTime) {
        this.recentAlerts.delete(id);
      }
    });

    logger.debug('Alerts deduplicated', { original: alerts.length, deduped: deduped.length });

    return deduped;
  }

  getRecentAlerts(): Alert[] {
    return Array.from(this.recentAlerts.values());
  }
}

class DynamicThresholdManager {
  private thresholds: Map<string, DynamicThreshold> = new Map();
  private counter = 0;

  calculateDynamicThreshold(metricName: string, baseline: number, deviationPercent: number = 20): DynamicThreshold {
    const threshold: DynamicThreshold = {
      metric: metricName,
      baselineValue: baseline,
      deviationPercent,
      calculatedThreshold: baseline * (1 + deviationPercent / 100),
      lastUpdated: Date.now()
    };

    this.thresholds.set(metricName, threshold);

    logger.debug('Dynamic threshold calculated', {
      metric: metricName,
      baseline,
      threshold: threshold.calculatedThreshold.toFixed(2)
    });

    return threshold;
  }

  updateBaseline(metricName: string, newBaseline: number): DynamicThreshold | undefined {
    const existing = this.thresholds.get(metricName);
    if (!existing) return undefined;

    const updated: DynamicThreshold = {
      ...existing,
      baselineValue: newBaseline,
      calculatedThreshold: newBaseline * (1 + existing.deviationPercent / 100),
      lastUpdated: Date.now()
    };

    this.thresholds.set(metricName, updated);

    return updated;
  }

  getThreshold(metricName: string): DynamicThreshold | undefined {
    return this.thresholds.get(metricName);
  }

  getAllThresholds(): DynamicThreshold[] {
    return Array.from(this.thresholds.values());
  }
}

export const alertManager = new AlertManager();
export const alertRouter = new AlertRouter();
export const alertDeduplicator = new AlertDeduplicator();
export const dynamicThresholdManager = new DynamicThresholdManager();

export { AlertRule, Alert, AlertRoute, DynamicThreshold };
