/**
 * Phase 147: Quality Gates & SLOs
 * Service Level Objectives, error budgets, and deployment gates
 */

import { logger } from './logger';

interface ServiceLevelObjective {
  name: string;
  availability: number;
  latencyP99: number;
  errorRate: number;
  period: 'monthly' | 'weekly' | 'daily';
}

interface ErrorBudget {
  name: string;
  total: string;
  consumed: string;
  remaining: string;
  burnRate: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface DeploymentApproval {
  approved: boolean;
  reason: string;
  blockers: string[];
  warnings: string[];
}

interface QualityMetrics {
  errorRate: number;
  latencyP99: number;
  availability: number;
  testPassRate: number;
  coverageChange: number;
}

class SLOManager {
  private slos: Map<string, ServiceLevelObjective> = new Map();
  private counter = 0;

  defineSLO(config: {
    name: string;
    availability: number;
    latencyP99: number;
    errorRate: number;
  }): ServiceLevelObjective {
    const slo: ServiceLevelObjective = {
      ...config,
      period: 'monthly'
    };

    this.slos.set(config.name, slo);

    logger.debug('SLO defined', {
      name: config.name,
      availability: config.availability,
      latencyP99: config.latencyP99
    });

    return slo;
  }

  getSLO(name: string): ServiceLevelObjective | undefined {
    return this.slos.get(name);
  }

  listSLOs(): ServiceLevelObjective[] {
    return Array.from(this.slos.values());
  }

  checkSLOCompliance(name: string, metrics: QualityMetrics): { compliant: boolean; violations: string[] } {
    const slo = this.slos.get(name);
    if (!slo) return { compliant: false, violations: ['SLO not found'] };

    const violations: string[] = [];

    if (metrics.availability < slo.availability) {
      violations.push(`Availability ${metrics.availability}% below SLO ${slo.availability}%`);
    }

    if (metrics.latencyP99 > slo.latencyP99) {
      violations.push(`P99 latency ${metrics.latencyP99}ms exceeds SLO ${slo.latencyP99}ms`);
    }

    if (metrics.errorRate > slo.errorRate) {
      violations.push(`Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds SLO ${(slo.errorRate * 100).toFixed(2)}%`);
    }

    return { compliant: violations.length === 0, violations };
  }
}

class ErrorBudgetTracker {
  private budgets: Map<string, { consumed: number; total: number; startTime: number }> = new Map();

  defineErrorBudget(serviceName: string, percentageAllowed: number): void {
    const secondsPerMonth = 30 * 24 * 60 * 60;
    const allowedDowntime = (secondsPerMonth * percentageAllowed) / 100;

    this.budgets.set(serviceName, {
      consumed: 0,
      total: allowedDowntime,
      startTime: Date.now()
    });

    logger.debug('Error budget defined', { service: serviceName, percentage: percentageAllowed });
  }

  recordBudgetUsage(serviceName: string, downtime: number): void {
    const budget = this.budgets.get(serviceName);
    if (budget) {
      budget.consumed += downtime;
    }
  }

  getRemaining(serviceName: string): ErrorBudget {
    const budget = this.budgets.get(serviceName);
    if (!budget) {
      return {
        name: serviceName,
        total: '0 seconds',
        consumed: '0 seconds',
        remaining: '0 seconds',
        burnRate: 0,
        status: 'critical'
      };
    }

    const remaining = Math.max(0, budget.total - budget.consumed);
    const elapsed = (Date.now() - budget.startTime) / 1000;
    const burnRate = elapsed > 0 ? budget.consumed / elapsed : 0;

    return {
      name: serviceName,
      total: `${Math.floor(budget.total)} seconds/month`,
      consumed: `${Math.floor(budget.consumed)} seconds`,
      remaining: `${Math.floor(remaining)} seconds`,
      burnRate,
      status: remaining < budget.total * 0.1 ? 'critical' : remaining < budget.total * 0.3 ? 'warning' : 'healthy'
    };
  }

  canDeploy(serviceName: string): boolean {
    const budget = this.getRemaining(serviceName);
    return budget.status !== 'critical';
  }
}

class DeploymentGate {
  private gates: Map<string, any> = new Map();

  canDeploy(metrics: QualityMetrics): DeploymentApproval {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (metrics.errorRate > 0.01) {
      blockers.push('Error rate exceeds 1%');
    }

    if (metrics.testPassRate < 0.95) {
      blockers.push('Test pass rate below 95%');
    }

    if (metrics.coverageChange < -2) {
      blockers.push('Coverage regression exceeds 2%');
    }

    if (metrics.latencyP99 > 600) {
      warnings.push('P99 latency approaching SLO threshold');
    }

    return {
      approved: blockers.length === 0,
      reason: blockers.length > 0 ? blockers[0] : 'All gates passed',
      blockers,
      warnings
    };
  }

  enforcePerformanceGate(fcp: number, lcp: number, cls: number): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    if (fcp > 2000) failures.push('FCP exceeds 2000ms');
    if (lcp > 2500) failures.push('LCP exceeds 2500ms');
    if (cls > 0.1) failures.push('CLS exceeds 0.1');

    return { passed: failures.length === 0, failures };
  }

  enforceCoverageGate(coverage: number, threshold: number): { passed: boolean; message: string } {
    const passed = coverage >= threshold;

    return {
      passed,
      message: passed
        ? `Coverage ${coverage}% meets threshold ${threshold}%`
        : `Coverage ${coverage}% below threshold ${threshold}%`
    };
  }
}

class QualityMetricsValidator {
  private validations: Map<string, QualityMetrics> = new Map();
  private counter = 0;

  validateMetrics(metrics: QualityMetrics): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (metrics.errorRate < 0 || metrics.errorRate > 1) {
      issues.push('Error rate must be between 0 and 1');
    }

    if (metrics.testPassRate < 0 || metrics.testPassRate > 1) {
      issues.push('Test pass rate must be between 0 and 1');
    }

    if (metrics.availability < 0 || metrics.availability > 100) {
      issues.push('Availability must be between 0 and 100');
    }

    return { valid: issues.length === 0, issues };
  }

  recordMetrics(serviceName: string, metrics: QualityMetrics): void {
    this.validations.set(serviceName, metrics);

    logger.debug('Quality metrics recorded', {
      service: serviceName,
      errorRate: (metrics.errorRate * 100).toFixed(2) + '%'
    });
  }

  getMetrics(serviceName: string): QualityMetrics | undefined {
    return this.validations.get(serviceName);
  }

  compareMetrics(serviceName: string, baseline: QualityMetrics): { regression: boolean; deltas: Record<string, number> } {
    const current = this.validations.get(serviceName);
    if (!current) return { regression: false, deltas: {} };

    const deltas = {
      errorRate: current.errorRate - baseline.errorRate,
      latencyP99: current.latencyP99 - baseline.latencyP99,
      availability: current.availability - baseline.availability,
      testPassRate: current.testPassRate - baseline.testPassRate
    };

    const regression = deltas.errorRate > 0.002 || deltas.latencyP99 > 50 || deltas.testPassRate < -0.01;

    return { regression, deltas };
  }
}

export const sloManager = new SLOManager();
export const errorBudgetTracker = new ErrorBudgetTracker();
export const deploymentGate = new DeploymentGate();
export const qualityMetricsValidator = new QualityMetricsValidator();

export { ServiceLevelObjective, ErrorBudget, DeploymentApproval, QualityMetrics };
