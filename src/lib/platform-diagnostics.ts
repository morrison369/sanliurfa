/**
 * Phase 28: Platform Diagnostics & Self-Healing
 * System health checks, automatic remediation, dependency tracking, SLA monitoring
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  duration: number;
  timestamp: number;
}

export interface OverallHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  summary: string;
  timestamp: number;
}

export interface RemediationRecord {
  checkName: string;
  triggeredAt: number;
  success: boolean;
  duration: number;
  message?: string;
}

export interface SLABreach {
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

type HealthCheckFn = () => Promise<HealthCheckResult>;
type RemediationFn = () => Promise<boolean>;

// ==================== HEALTH CHECKER ====================

export class HealthChecker {
  private checks = new Map<string, HealthCheckFn>();
  private lastResults = new Map<string, HealthCheckResult>();

  /**
   * Register health check
   */
  registerCheck(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
    logger.debug('Health check registered', { name });
  }

  /**
   * Run all checks
   */
  async runAll(): Promise<OverallHealth> {
    const results: HealthCheckResult[] = [];

    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results.push(result);
        this.lastResults.set(name, result);
      } catch (err) {
        const result: HealthCheckResult = {
          name,
          status: 'unhealthy',
          message: err instanceof Error ? err.message : String(err),
          duration: 0,
          timestamp: Date.now()
        };
        results.push(result);
        this.lastResults.set(name, result);
      }
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;

    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > results.length * 0.1) {
      // More than 10% degraded
      overallStatus = 'degraded';
    }

    const summary = `${results.filter(r => r.status === 'healthy').length} healthy, ${degradedCount} degraded, ${unhealthyCount} unhealthy`;

    return {
      status: overallStatus,
      checks: results,
      summary,
      timestamp: Date.now()
    };
  }

  /**
   * Run single check
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return {
        name,
        status: 'unhealthy',
        message: `Check not found: ${name}`,
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();
    try {
      const result = await checkFn();
      result.duration = Date.now() - startTime;
      this.lastResults.set(name, result);
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      return {
        name,
        status: 'unhealthy',
        message: err instanceof Error ? err.message : String(err),
        duration,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get last results
   */
  getLastResults(): Map<string, HealthCheckResult> {
    return new Map(this.lastResults);
  }
}

// ==================== SELF-HEALING MANAGER ====================

export class SelfHealingManager {
  private remediations = new Map<string, RemediationFn>();
  private history: RemediationRecord[] = [];
  private readonly maxHistory = 1000;

  /**
   * Register remediation action
   */
  registerRemediation(checkName: string, remediate: RemediationFn): void {
    this.remediations.set(checkName, remediate);
    logger.debug('Remediation registered', { checkName });
  }

  /**
   * Trigger remediation
   */
  async triggerRemediation(checkName: string): Promise<boolean> {
    const remediation = this.remediations.get(checkName);
    if (!remediation) {
      logger.warn('No remediation for check', { checkName });
      return false;
    }

    const startTime = Date.now();

    try {
      const success = await remediation();
      const duration = Date.now() - startTime;

      this.history.push({
        checkName,
        triggeredAt: startTime,
        success,
        duration,
        message: success ? 'Remediation successful' : 'Remediation failed'
      });

      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      if (success) {
        logger.info('Remediation successful', { checkName, duration });
      } else {
        logger.warn('Remediation failed', { checkName, duration });
      }

      return success;
    } catch (err) {
      const duration = Date.now() - startTime;

      this.history.push({
        checkName,
        triggeredAt: startTime,
        success: false,
        duration,
        message: err instanceof Error ? err.message : String(err)
      });

      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      logger.error('Remediation error', err instanceof Error ? err : new Error(String(err)), { checkName, duration });
      return false;
    }
  }

  /**
   * Get remediation history
   */
  getRemediationHistory(): RemediationRecord[] {
    return [...this.history];
  }

  /**
   * Get statistics
   */
  getStats(): { attempted: number; succeeded: number; successRate: number } {
    if (this.history.length === 0) {
      return { attempted: 0, succeeded: 0, successRate: 0 };
    }

    const succeeded = this.history.filter(r => r.success).length;

    return {
      attempted: this.history.length,
      succeeded,
      successRate: (succeeded / this.history.length) * 100
    };
  }
}

// ==================== DEPENDENCY GRAPH ====================

export class DependencyGraph {
  private dependencies = new Map<string, Set<string>>(); // service -> dependsOn

  /**
   * Add dependency
   */
  addDependency(service: string, dependsOn: string[]): void {
    if (!this.dependencies.has(service)) {
      this.dependencies.set(service, new Set());
    }

    for (const dep of dependsOn) {
      this.dependencies.get(service)!.add(dep);
    }
  }

  /**
   * Get dependencies
   */
  getDependencies(service: string): string[] {
    return Array.from(this.dependencies.get(service) || []);
  }

  /**
   * Get impacted services (transitive dependents)
   */
  getImpactedServices(failedService: string): string[] {
    const impacted = new Set<string>();
    const queue = [failedService];

    while (queue.length > 0) {
      const service = queue.shift()!;

      // Find all services that depend on this service
      for (const [dependent, deps] of this.dependencies) {
        if (deps.has(service) && !impacted.has(dependent)) {
          impacted.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return Array.from(impacted);
  }

  /**
   * Get critical path (services with no failover)
   */
  getCriticalPath(): string[] {
    const criticalServices: string[] = [];

    for (const [service, deps] of this.dependencies) {
      // A service is critical if many others depend on it
      let dependentCount = 0;
      for (const [, serviceDeps] of this.dependencies) {
        if (serviceDeps.has(service)) {
          dependentCount++;
        }
      }

      if (dependentCount > 2) {
        // More than 2 services depend on it
        criticalServices.push(service);
      }
    }

    return criticalServices;
  }
}

// ==================== SLA TRACKER ====================

export interface SLATarget {
  name: string;
  metric: string;
  threshold: number;
  comparisonFn: (val: number, threshold: number) => boolean;
}

export class SLATracker {
  private targets = new Map<string, SLATarget>();
  private breaches: SLABreach[] = [];
  private readonly maxHistory = 10000;

  /**
   * Define SLA target
   */
  defineTarget(name: string, metric: string, threshold: number, comparisonFn: (val: number, threshold: number) => boolean): void {
    this.targets.set(name, { name, metric, threshold, comparisonFn });
    logger.debug('SLA target defined', { name, metric, threshold });
  }

  /**
   * Record metric value
   */
  record(metric: string, value: number): void {
    for (const [, target] of this.targets) {
      if (target.metric === metric) {
        if (!target.comparisonFn(value, target.threshold)) {
          this.breaches.push({
            metric,
            value,
            threshold: target.threshold,
            timestamp: Date.now()
          });

          if (this.breaches.length > this.maxHistory) {
            this.breaches.shift();
          }

          logger.warn('SLA breach detected', { metric, value, threshold: target.threshold });
        }
      }
    }
  }

  /**
   * Get compliance ratio
   */
  getCompliance(targetName: string, windowMs: number = 3600000): number {
    const target = this.targets.get(targetName);
    if (!target) return 0;

    const cutoff = Date.now() - windowMs;
    const relevantBreaches = this.breaches.filter(b => b.metric === target.metric && b.timestamp >= cutoff);

    // Assume high check frequency (e.g., every minute = ~60 checks per hour)
    const estimatedChecks = Math.ceil(windowMs / (60 * 1000));
    const breachCount = relevantBreaches.length;

    return Math.max(0, (estimatedChecks - breachCount) / estimatedChecks);
  }

  /**
   * Get breaches
   */
  getBreaches(targetName: string): SLABreach[] {
    const target = this.targets.get(targetName);
    if (!target) return [];

    return this.breaches.filter(b => b.metric === target.metric).slice(-100);
  }
}

// ==================== EXPORTS ====================

export const healthChecker = new HealthChecker();
export const selfHealingManager = new SelfHealingManager();
export const dependencyGraph = new DependencyGraph();
export const slaTracker = new SLATracker();
