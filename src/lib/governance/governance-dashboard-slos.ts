/**
 * Phase 172: Governance Dashboard & SLOs
 */

import { logger } from '../logger';

export interface GovernanceSLO {
  sloId: string;
  name: string;
  target: number;
  current: number;
  unit: '%' | 'count' | 'ms' | 'hours';
}

class GovernanceSLOManager {
  private slos = new Map<string, GovernanceSLO>();
  private counter = 0;

  create(input: Omit<GovernanceSLO, 'sloId'>): GovernanceSLO {
    const sloId = `gov-slo-${Date.now()}-${++this.counter}`;
    const slo: GovernanceSLO = { ...input, sloId };
    this.slos.set(sloId, slo);
    return slo;
  }

  updateCurrent(sloId: string, current: number): GovernanceSLO | undefined {
    const existing = this.slos.get(sloId);
    if (!existing) return undefined;
    const next = { ...existing, current };
    this.slos.set(sloId, next);
    return next;
  }

  status(sloId: string): { met: boolean; burnRate: number } | undefined {
    const slo = this.slos.get(sloId);
    if (!slo) return undefined;
    const met = slo.current >= slo.target;
    const burnRate = slo.target === 0 ? 0 : Math.round(((slo.target - slo.current) / slo.target) * 1000) / 10;
    return { met, burnRate };
  }

  list(): GovernanceSLO[] {
    return Array.from(this.slos.values());
  }
}

class GovernanceKPIAggregator {
  summarize(input: {
    totalControls: number;
    passedControls: number;
    openExceptions: number;
    expiringExceptions: number;
  }): {
    controlPassRate: number;
    exceptionRiskRate: number;
    readinessScore: number;
  } {
    const controlPassRate = input.totalControls === 0 ? 0 : (input.passedControls / input.totalControls) * 100;
    const exceptionRiskRate = input.openExceptions === 0 ? 0 : (input.expiringExceptions / input.openExceptions) * 100;
    const readinessScore = Math.max(0, Math.round((controlPassRate * 0.8 - exceptionRiskRate * 0.2) * 10) / 10);
    return {
      controlPassRate: Math.round(controlPassRate * 10) / 10,
      exceptionRiskRate: Math.round(exceptionRiskRate * 10) / 10,
      readinessScore
    };
  }
}

class GovernanceReadinessBoard {
  build(input: {
    domainScores: Record<string, number>;
    blockedControls: string[];
    expiringExceptions: string[];
  }): {
    overall: number;
    domains: Record<string, number>;
    blockedControls: string[];
    expiringExceptions: string[];
    status: 'green' | 'amber' | 'red';
  } {
    const values = Object.values(input.domainScores);
    const overall = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;
    const status: 'green' | 'amber' | 'red' = overall >= 85 ? 'green' : overall >= 70 ? 'amber' : 'red';
    return {
      overall,
      domains: input.domainScores,
      blockedControls: input.blockedControls,
      expiringExceptions: input.expiringExceptions,
      status
    };
  }
}

class GovernanceReportingService {
  exportJson(report: Record<string, unknown>): string {
    return JSON.stringify(report, null, 2);
  }

  exportSummaryLine(report: { overall: number; status: string; blockedControls: string[] }): string {
    const line = `readiness=${report.overall};status=${report.status};blocked=${report.blockedControls.length}`;
    logger.debug('Governance report exported', { line });
    return line;
  }
}

export const governanceSloManager = new GovernanceSLOManager();
export const governanceKpiAggregator = new GovernanceKPIAggregator();
export const governanceReadinessBoard = new GovernanceReadinessBoard();
export const governanceReportingService = new GovernanceReportingService();

export {
  GovernanceSLOManager,
  GovernanceKPIAggregator,
  GovernanceReadinessBoard,
  GovernanceReportingService
};


