/**
 * Phase 184: Data Quality SLAs
 * SLA definition, monitoring, breach notification, compliance reporting
 */

import { logger } from './logger';

interface DataQualitySLA {
  slaId: string;
  dataProductId: string;
  name: string;
  dimensions: {
    completeness?: number;
    accuracy?: number;
    timeliness?: number;
    consistency?: number;
    uniqueness?: number;
  };
  measurementFrequencyMs: number;
  alertThresholds: { warning: number; critical: number };
  createdAt: number;
  status: 'active' | 'paused' | 'archived';
}

interface SLAMeasurement {
  measurementId: string;
  slaId: string;
  values: { completeness?: number; accuracy?: number; timeliness?: number; consistency?: number; uniqueness?: number };
  overallScore: number;
  compliant: boolean;
  measuredAt: number;
}

interface SLABreach {
  breachId: string;
  slaId: string;
  dimension: string;
  expectedValue: number;
  actualValue: number;
  severity: 'warning' | 'critical';
  notifiedAt?: number;
  resolvedAt?: number;
}

class SLADefinitionManager {
  private slas: Map<string, DataQualitySLA> = new Map();
  private counter = 0;

  define(dataProductId: string, name: string, dimensions: DataQualitySLA['dimensions'], frequencyMs: number = 3600000): DataQualitySLA {
    const slaId = `sla-${Date.now()}-${++this.counter}`;
    const sla: DataQualitySLA = {
      slaId, dataProductId, name, dimensions,
      measurementFrequencyMs: frequencyMs,
      alertThresholds: { warning: 90, critical: 80 },
      createdAt: Date.now(), status: 'active'
    };
    this.slas.set(slaId, sla);
    logger.debug('Data quality SLA defined', { slaId, dataProductId, name });
    return sla;
  }

  setThresholds(slaId: string, warning: number, critical: number): DataQualitySLA | undefined {
    const sla = this.slas.get(slaId);
    if (sla) { sla.alertThresholds = { warning, critical }; return sla; }
    return undefined;
  }

  getSLA(slaId: string): DataQualitySLA | undefined {
    return this.slas.get(slaId);
  }

  getActiveSLAs(dataProductId?: string): DataQualitySLA[] {
    return Array.from(this.slas.values()).filter(s =>
      s.status === 'active' && (!dataProductId || s.dataProductId === dataProductId)
    );
  }

  pause(slaId: string): boolean {
    const sla = this.slas.get(slaId);
    if (sla) { sla.status = 'paused'; return true; }
    return false;
  }
}

class SLAMonitor {
  private measurements: Map<string, SLAMeasurement[]> = new Map();
  private counter = 0;

  measure(sla: DataQualitySLA, values: SLAMeasurement['values']): SLAMeasurement {
    const measurementId = `measure-${Date.now()}-${++this.counter}`;

    const definedDimensions = Object.keys(sla.dimensions) as Array<keyof typeof sla.dimensions>;
    const scores = definedDimensions.map(dim => values[dim] ?? 100);
    const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
    const compliant = overallScore >= sla.alertThresholds.critical;

    const measurement: SLAMeasurement = {
      measurementId, slaId: sla.slaId, values, overallScore, compliant, measuredAt: Date.now()
    };

    const existing = this.measurements.get(sla.slaId) || [];
    existing.push(measurement);
    this.measurements.set(sla.slaId, existing);

    if (!compliant) {
      logger.debug('SLA compliance failure', {
        slaId: sla.slaId,
        overallScore: overallScore.toFixed(1),
        threshold: sla.alertThresholds.critical
      });
    }

    return measurement;
  }

  getLatestMeasurement(slaId: string): SLAMeasurement | undefined {
    const history = this.measurements.get(slaId) || [];
    return history[history.length - 1];
  }

  getComplianceRate(slaId: string, windowSize: number = 10): number {
    const history = (this.measurements.get(slaId) || []).slice(-windowSize);
    if (!history.length) return 100;
    return (history.filter(m => m.compliant).length / history.length) * 100;
  }

  getNonCompliantSLAs(slaIds: string[]): string[] {
    return slaIds.filter(id => {
      const latest = this.getLatestMeasurement(id);
      return latest && !latest.compliant;
    });
  }
}

class SLABreachNotifier {
  private breaches: Map<string, SLABreach> = new Map();
  private notifications: Array<{ breachId: string; channel: string; sentAt: number }> = [];
  private counter = 0;

  detectAndReport(sla: DataQualitySLA, measurement: SLAMeasurement): SLABreach[] {
    const newBreaches: SLABreach[] = [];

    for (const [dim, required] of Object.entries(sla.dimensions)) {
      const actual = (measurement.values as any)[dim];
      if (actual === undefined) continue;

      if (actual < sla.alertThresholds.critical) {
        const breach = this.createBreach(sla.slaId, dim, required as number, actual, 'critical');
        newBreaches.push(breach);
      } else if (actual < sla.alertThresholds.warning) {
        const breach = this.createBreach(sla.slaId, dim, required as number, actual, 'warning');
        newBreaches.push(breach);
      }
    }

    return newBreaches;
  }

  private createBreach(slaId: string, dimension: string, expected: number, actual: number, severity: SLABreach['severity']): SLABreach {
    const breachId = `breach-${Date.now()}-${++this.counter}`;
    const breach: SLABreach = { breachId, slaId, dimension, expectedValue: expected, actualValue: actual, severity };
    this.breaches.set(breachId, breach);
    return breach;
  }

  notify(breachId: string, channel: 'email' | 'slack' | 'pagerduty'): boolean {
    const breach = this.breaches.get(breachId);
    if (breach) {
      breach.notifiedAt = Date.now();
      this.notifications.push({ breachId, channel, sentAt: Date.now() });
      logger.debug('SLA breach notification sent', { breachId, channel, severity: breach.severity });
      return true;
    }
    return false;
  }

  resolveBreach(breachId: string): boolean {
    const breach = this.breaches.get(breachId);
    if (breach) { breach.resolvedAt = Date.now(); return true; }
    return false;
  }

  getOpenBreaches(): SLABreach[] {
    return Array.from(this.breaches.values()).filter(b => !b.resolvedAt);
  }
}

class SLAReporter {
  generateReport(slaId: string, sla: DataQualitySLA, measurements: SLAMeasurement[], breaches: SLABreach[]): {
    slaId: string;
    dataProductId: string;
    period: string;
    measurementCount: number;
    complianceRate: number;
    avgScore: number;
    breachCount: number;
    criticalBreaches: number;
    status: 'green' | 'yellow' | 'red';
  } {
    const complianceRate = measurements.length > 0
      ? (measurements.filter(m => m.compliant).length / measurements.length) * 100 : 100;
    const avgScore = measurements.length > 0
      ? measurements.reduce((sum, m) => sum + m.overallScore, 0) / measurements.length : 100;
    const criticalBreaches = breaches.filter(b => b.severity === 'critical').length;

    const status = complianceRate >= 99 ? 'green' : complianceRate >= 95 ? 'yellow' : 'red';

    logger.debug('SLA report generated', { slaId, complianceRate: complianceRate.toFixed(1), status });

    return {
      slaId, dataProductId: sla.dataProductId,
      period: new Date().toISOString().substring(0, 7),
      measurementCount: measurements.length,
      complianceRate, avgScore,
      breachCount: breaches.length, criticalBreaches, status
    };
  }

  generateTrendReport(measurements: SLAMeasurement[]): { trend: 'improving' | 'declining' | 'stable'; changeRate: number } {
    if (measurements.length < 4) return { trend: 'stable', changeRate: 0 };
    const half = Math.floor(measurements.length / 2);
    const firstHalfAvg = measurements.slice(0, half).reduce((sum, m) => sum + m.overallScore, 0) / half;
    const secondHalfAvg = measurements.slice(half).reduce((sum, m) => sum + m.overallScore, 0) / (measurements.length - half);
    const changeRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    return {
      trend: changeRate > 1 ? 'improving' : changeRate < -1 ? 'declining' : 'stable',
      changeRate
    };
  }
}

export const slaDefinitionManager = new SLADefinitionManager();
export const slaMonitor = new SLAMonitor();
export const slaBreachNotifier = new SLABreachNotifier();
export const slaReporter = new SLAReporter();

export { DataQualitySLA, SLAMeasurement, SLABreach };
