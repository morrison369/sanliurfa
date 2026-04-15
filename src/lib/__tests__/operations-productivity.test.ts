/**
 * Tests: Phase 227-232 — Advanced Operations & Productivity Intelligence
 */

import { describe, it, expect } from 'vitest';
import {
  productivityTracker, teamProductivityAnalyzer, timeUtilizationAnalyzer, productivityBenchmarker,
  operationalKPITracker, bottleneckDetector, capacityPlanner, opsHealthMonitor,
  resourceManager, allocationTracker, utilizationReporter, optimizationRecommender,
  processEventLogger, processDiscoveryEngine, conformanceChecker, processVariantAnalyzer,
  toolAdoptionTracker, collaborationPatternAnalyzer, digitalFrictionMonitor, workplaceExperienceScorer,
  operationalRiskRegister, riskControlManager, lossEventTracker, riskHeatmapGenerator
} from '../index';

// Phase 227: Productivity Analytics
describe('Phase 227 — Productivity Analytics', () => {
  it('records productivity and calculates composite index', () => {
    const rec = productivityTracker.record('emp-1', '2026-Q1', 18, 20, 85, 90, 5, 3);
    expect(rec.productivityIndex).toBeGreaterThan(0);
    expect(rec.productivityIndex).toBeLessThanOrEqual(100);
  });

  it('analyzes team productivity and identifies top/at-risk members', () => {
    const r1 = productivityTracker.record('emp-10', '2026-Q1', 20, 20, 90, 88, 6, 2);
    const r2 = productivityTracker.record('emp-11', '2026-Q1', 8, 20, 50, 55, 3, 5);
    const summary = teamProductivityAnalyzer.analyze('team-A', '2026-Q1', [r1, r2], 75);
    expect(summary.memberCount).toBe(2);
    expect(summary.topPerformerIds).toContain('emp-10');
    expect(summary.atRiskMemberIds).toContain('emp-11');
  });

  it('records time utilization and detects meeting-heavy employees', () => {
    timeUtilizationAnalyzer.record('emp-20', '2026-Q1', 10, 25, 5, 8);
    const meetingHeavy = timeUtilizationAnalyzer.getMeetingHeavy(0.4);
    expect(meetingHeavy).toContain('emp-20');
  });

  it('sets productivity benchmark and returns gap analysis', () => {
    productivityBenchmarker.set('engineer', 'tasks_per_sprint', 15, 22, 18);
    const gaps = productivityBenchmarker.getGaps('engineer');
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].status).toBe('average');
    expect(gaps[0].gap).toBe(3);
  });
});

// Phase 228: Operations Intelligence
describe('Phase 228 — Operations Intelligence', () => {
  it('records KPI and determines correct status', () => {
    const kpi = operationalKPITracker.record('Order Fulfillment Rate', 'throughput', 95, 100, '%', '2026-Q1');
    expect(kpi.achievementPct).toBe(95);
    expect(kpi.status).toBe('at_risk');
  });

  it('detects bottleneck and assigns severity', () => {
    const bottleneck = bottleneckDetector.detect('order-processing', 'payment-gateway', 3000, 80, 50, 92);
    expect(bottleneck.severity).toBe('critical');
    const critical = bottleneckDetector.getCritical();
    expect(critical.length).toBeGreaterThan(0);
  });

  it('plans capacity and recommends action', () => {
    const plan = capacityPlanner.plan('compute-nodes', 100, 92, 110, '2026-Q2');
    expect(plan.recommendedAction).toBe('scale_up');
    expect(plan.utilizationRate).toBe(92);
  });

  it('generates ops health report with health score', () => {
    const report = opsHealthMonitor.generate('2026-Q1', 8, 2, 1, 75, 3, 120000);
    expect(report.overallHealthScore).toBeGreaterThanOrEqual(0);
    expect(report.overallHealthScore).toBeLessThanOrEqual(100);
    expect(opsHealthMonitor.getExecutionHealth()).toMatch(/healthy|warning|critical/);
  });
});

// Phase 229: Resource Optimization
describe('Phase 229 — Resource Optimization', () => {
  it('adds resource and allocates/releases units', () => {
    const res = resourceManager.add('Backend Engineers', 'human', 10, 'FTE', 5000);
    expect(res.available).toBe(10);
    resourceManager.allocate(res.resourceId, 3);
    expect(resourceManager.getResource(res.resourceId)!.available).toBe(7);
    resourceManager.release(res.resourceId, 1);
    expect(resourceManager.getResource(res.resourceId)!.available).toBe(8);
  });

  it('creates allocation and detects low utilization', () => {
    const res = resourceManager.getByType('human')[0];
    const now = Date.now();
    const alloc = allocationTracker.create(res.resourceId, 'proj-1', 3, now, now + 30 * 86400 * 1000);
    allocationTracker.updateUtilization(alloc.allocationId, 25);
    const low = allocationTracker.getLowUtilization(40);
    expect(low.length).toBeGreaterThan(0);
  });

  it('reports utilization and calculates wasted cost', () => {
    const res = resourceManager.getByType('human')[0];
    const report = utilizationReporter.report(res.resourceId, '2026-Q1', 10, 6, 5000);
    expect(report.utilizationRate).toBe(60);
    expect(report.wastedCost).toBe(20000);
    expect(utilizationReporter.getTotalWastedCost()).toBeGreaterThan(0);
  });

  it('creates optimization recommendation with priority score', () => {
    const res = resourceManager.getByType('human')[0];
    const rec = optimizationRecommender.recommend(res.resourceId, 'scale_down', 'Reduce team size by 20%', 50000, 'low');
    expect(rec.priority).toBeGreaterThan(0);
    const top = optimizationRecommender.getTopRecommendations();
    expect(top.length).toBeGreaterThan(0);
  });
});

// Phase 230: Process Mining
describe('Phase 230 — Process Mining', () => {
  it('logs process events and retrieves case history', () => {
    processEventLogger.log('case-1', 'submit_order', 'user', 100);
    processEventLogger.log('case-1', 'validate_payment', 'system', 200);
    processEventLogger.log('case-1', 'fulfill_order', 'warehouse', 500);
    const events = processEventLogger.getCaseEvents('case-1');
    expect(events.length).toBe(3);
    expect(events[0].activity).toBe('submit_order');
  });

  it('discovers process from case events', () => {
    const caseMap = new Map([['case-1', processEventLogger.getCaseEvents('case-1')]]);
    const process = processDiscoveryEngine.discover('Order Fulfillment', caseMap);
    expect(process.activities.length).toBeGreaterThan(0);
    expect(process.caseCount).toBe(1);
    expect(process.transitions.length).toBeGreaterThan(0);
  });

  it('checks conformance and scores deviations', () => {
    const process = processDiscoveryEngine.getAllProcesses()[0];
    const result = conformanceChecker.check(process.processId, 'case-2', ['A', 'B', 'C'], ['A', 'X', 'C']);
    expect(result.isConformant).toBe(false);
    expect(result.conformanceScore).toBeLessThan(100);
    expect(result.deviations.length).toBeGreaterThan(0);
  });

  it('analyzes process variants and finds happy path', () => {
    const sequences = [['A', 'B', 'C'], ['A', 'B', 'C'], ['A', 'X', 'C']];
    const process = processDiscoveryEngine.getAllProcesses()[0];
    const variants = processVariantAnalyzer.analyze(process.processId, sequences);
    expect(variants.length).toBe(2);
    const happy = processVariantAnalyzer.getHappyPath(process.processId);
    expect(happy!.frequency).toBe(2);
    expect(happy!.isHappyPath).toBe(true);
  });
});

// Phase 231: Digital Workplace Analytics
describe('Phase 231 — Digital Workplace Analytics', () => {
  it('records tool adoption and detects low adoption tools', () => {
    toolAdoptionTracker.record('Notion', 'productivity', 100, 40, 5, 30, 60, '2026-Q1');
    toolAdoptionTracker.record('Slack', 'communication', 100, 95, 15, 20, 75, '2026-Q1');
    const low = toolAdoptionTracker.getLowAdoption(50);
    expect(low.some(m => m.toolName === 'Notion')).toBe(true);
    expect(low.some(m => m.toolName === 'Slack')).toBe(false);
  });

  it('analyzes collaboration patterns and scores teams', () => {
    const pattern = collaborationPatternAnalyzer.analyze('team-B', '2026-Q1', 12, 30, 0.6, 45, 8, 25);
    expect(pattern.collaborationScore).toBeGreaterThanOrEqual(0);
    const heavy = collaborationPatternAnalyzer.getMeetingHeavyTeams(15);
    expect(heavy.length).toBe(0);
  });

  it('tracks digital friction and finds top friction tools', () => {
    digitalFrictionMonitor.report('emp-30', 'Legacy CRM', 'slow_load', 'high', 15);
    digitalFrictionMonitor.report('emp-31', 'Legacy CRM', 'login_failure', 'medium', 10);
    const top = digitalFrictionMonitor.getTopFrictionTools();
    expect(top[0].toolName).toBe('Legacy CRM');
    expect(top[0].totalTimeWasted).toBe(25);
  });

  it('scores workplace experience and detects low DEX employees', () => {
    workplaceExperienceScorer.score('emp-40', '2026-Q1', 80, 75, 70, 85);
    workplaceExperienceScorer.score('emp-41', '2026-Q1', 45, 40, 50, 55);
    const low = workplaceExperienceScorer.getLowDEXEmployees(60);
    expect(low).toContain('emp-41');
    expect(low).not.toContain('emp-40');
  });
});

// Phase 232: Operational Risk Management
describe('Phase 232 — Operational Risk Management', () => {
  it('registers operational risk and calculates risk level', () => {
    const risk = operationalRiskRegister.register('System Outage', 'technology', 'Core system unavailability', 4, 5, 'cto@company.com');
    expect(risk.riskScore).toBe(20);
    expect(risk.riskLevel).toBe('critical');
    const topRisks = operationalRiskRegister.getTopRisks(5);
    expect(topRisks[0].riskScore).toBeGreaterThanOrEqual(20);
  });

  it('adds risk control and calculates residual score', () => {
    const risk = operationalRiskRegister.getTopRisks(1)[0];
    riskControlManager.add(risk.riskId, 'Redundancy failover', 'preventive', 'highly_effective', 60, 'infra-team');
    const residual = riskControlManager.getResidualRiskScore(risk.riskId, risk.riskScore);
    expect(residual).toBeLessThan(risk.riskScore);
  });

  it('records loss event and sums total financial loss', () => {
    const risk = operationalRiskRegister.getTopRisks(1)[0];
    lossEventTracker.record(risk.riskId, '4-hour outage event', 250000, 'Major SLA breach', 'DB failover failure', ['monitoring'], 'Improve alerting thresholds', ['redundancy_upgrade']);
    expect(lossEventTracker.getTotalFinancialLoss()).toBeGreaterThan(0);
    const topCauses = lossEventTracker.getTopLossCauses();
    expect(topCauses.length).toBeGreaterThan(0);
  });

  it('places risk on heatmap and retrieves critical quadrant', () => {
    riskHeatmapGenerator.place('risk-A', 5, 5);
    riskHeatmapGenerator.place('risk-B', 2, 2);
    const critical = riskHeatmapGenerator.getCriticalQuadrant();
    expect(critical.length).toBeGreaterThan(0);
    const monitor = riskHeatmapGenerator.getByQuadrant('monitor');
    expect(monitor.length).toBeGreaterThan(0);
  });
});
