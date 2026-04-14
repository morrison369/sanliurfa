/**
 * Phase 175: Continuous Compliance Scheduler
 */

import { logger } from '../logger';

export interface ComplianceJob {
  jobId: string;
  name: string;
  framework: string;
  intervalMinutes: number;
  nextRunAt: number;
  enabled: boolean;
}

class ComplianceScheduleEngine {
  private jobs = new Map<string, ComplianceJob>();
  private counter = 0;

  register(name: string, framework: string, intervalMinutes: number): ComplianceJob {
    const job: ComplianceJob = {
      jobId: `cc-job-${Date.now()}-${++this.counter}`,
      name,
      framework,
      intervalMinutes,
      nextRunAt: Date.now() + intervalMinutes * 60 * 1000,
      enabled: true
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  list(): ComplianceJob[] {
    return Array.from(this.jobs.values());
  }

  due(now = Date.now()): ComplianceJob[] {
    return this.list().filter(j => j.enabled && j.nextRunAt <= now);
  }
}

class ComplianceWindowPlanner {
  nextWindow(intervalMinutes: number, from = Date.now()): number {
    return from + intervalMinutes * 60 * 1000;
  }

  alignToHour(timestamp: number): number {
    const d = new Date(timestamp);
    d.setMinutes(0, 0, 0);
    return d.getTime();
  }
}

class ComplianceDriftWatcher {
  detect(expectedScore: number, actualScore: number): { drift: number; status: 'ok' | 'warn' | 'critical' } {
    const drift = Math.round((expectedScore - actualScore) * 10) / 10;
    const status: 'ok' | 'warn' | 'critical' = drift <= 5 ? 'ok' : drift <= 15 ? 'warn' : 'critical';
    return { drift, status };
  }
}

class ComplianceExecutionReporter {
  summarize(runs: Array<{ jobId: string; success: boolean; durationMs: number }>): {
    total: number;
    successRate: number;
    avgDurationMs: number;
  } {
    if (runs.length === 0) return { total: 0, successRate: 0, avgDurationMs: 0 };
    const success = runs.filter(r => r.success).length;
    const avg = runs.reduce((a, b) => a + b.durationMs, 0) / runs.length;
    logger.debug('Compliance run summary', { total: runs.length, successRate: (success / runs.length) * 100 });
    return {
      total: runs.length,
      successRate: Math.round((success / runs.length) * 1000) / 10,
      avgDurationMs: Math.round(avg)
    };
  }
}

export const complianceScheduleEngine = new ComplianceScheduleEngine();
export const complianceWindowPlanner = new ComplianceWindowPlanner();
export const complianceDriftWatcher = new ComplianceDriftWatcher();
export const complianceExecutionReporter = new ComplianceExecutionReporter();

export {
  ComplianceScheduleEngine,
  ComplianceWindowPlanner,
  ComplianceDriftWatcher,
  ComplianceExecutionReporter
};


