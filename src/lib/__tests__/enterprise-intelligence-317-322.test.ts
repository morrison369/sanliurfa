/**
 * Tests for Phase 317-322: Inventory Optimization, Channel Analytics, Project Portfolio,
 * Customer Health, Network & Infrastructure, Sustainability Intelligence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  inventoryManager, reorderManager, abcAnalyzer, stockOptimizer
} from '../inventory-optimization-intelligence';
import {
  channelManager, attributionEngine, channelMixOptimizer, channelFunnelAnalyzer
} from '../channel-analytics-intelligence';
import {
  projectManager, portfolioManager, resourceAllocationManager, deliveryMetricsAnalyzer
} from '../project-portfolio-intelligence';
import {
  customerHealthEngine, churnPredictor, expansionSignalDetector, lifecycleStageManager
} from '../customer-health-intelligence';
import {
  networkNodeManager, bandwidthAnalyzer, capacityPlanner, infrastructureAlertManager
} from '../network-infrastructure-intelligence';
import {
  carbonTracker, esgMetricsManager, energyManager, sustainabilityReportGenerator
} from '../sustainability-intelligence';

// ─── Phase 317: Inventory Optimization ────────────────────────────────────────

describe('Phase 317: Inventory Optimization Intelligence', () => {
  it('registers inventory and calculates ABC class and stock status', () => {
    const item = inventoryManager.register('Widget A', 'SKU-001', 'Warehouse-1', 500, 10, 5, 25, 50000, 200000);
    expect(item.inventoryId).toMatch(/^inv-/);
    expect(item.safetyStock).toBe(Math.ceil(10 * 5 * 0.5));
    expect(item.reorderPoint).toBe(Math.ceil(10 * 5 + item.safetyStock));
    expect(['A', 'B', 'C']).toContain(item.abcClass);
    expect(['optimal', 'understock', 'overstock', 'critical', 'dead_stock']).toContain(item.stockStatus);
  });

  it('triggers reorder with EOQ and correct urgency', () => {
    const reorder = reorderManager.trigger('SKU-002', 'Widget B', 'below_reorder_point', 5, 50, 15, 10, 7);
    expect(reorder.reorderId).toMatch(/^reorder-/);
    expect(reorder.economicOrderQty).toBeGreaterThan(0);
    expect(reorder.suggestedOrderQty).toBeGreaterThanOrEqual(reorder.economicOrderQty);
    expect(reorder.urgency).toBe('high');  // stock < reorderPoint * 0.5
    expect(reorder.status).toBe('pending');
  });

  it('performs ABC analysis on inventory items', () => {
    const item1 = inventoryManager.register('Premium', 'SKU-010', 'WH-1', 100, 5, 3, 50, 80000, 100000);
    const item2 = inventoryManager.register('Basic', 'SKU-011', 'WH-1', 200, 2, 3, 10, 3000, 100000);
    const analysis = abcAnalyzer.analyze('2025-Q1', [item1, item2], 100000);
    expect(analysis.recordId).toMatch(/^abc-/);
    expect(analysis.totalSKUs).toBe(2);
    expect(analysis.classACount + analysis.classBCount + analysis.classCCount).toBe(2);
  });

  it('optimizes stock policy with service level z-scores', () => {
    const item = inventoryManager.register('Fast Mover', 'SKU-020', 'WH-2', 300, 20, 4, 15, 100000, 200000);
    const optimization = stockOptimizer.optimize(item, 95);
    expect(optimization.recordId).toMatch(/^stockopt-/);
    expect(optimization.optimizedPolicy.safetyStock).toBeGreaterThan(0);
    expect(optimization.serviceLevel).toBe(95);
    expect(optimization.currentHoldingCostUSD).toBeGreaterThanOrEqual(0);
  });
});

// ─── Phase 318: Channel Analytics ─────────────────────────────────────────────

describe('Phase 318: Channel Analytics Intelligence', () => {
  it('registers channel and calculates ROAS and status', () => {
    const channel = channelManager.register('Google Ads', 'paid_search', 10000);
    channelManager.updateMetrics(channel.channelId, 8000, 100000, 5000, 200, 40000);
    const updated = channelManager.getChannel(channel.channelId)!;
    expect(updated.roas).toBe(5);
    expect(updated.ctr).toBeGreaterThan(0);
    expect(updated.status).toBe('top_performer');
  });

  it('attributes conversions across touchpoints with last_click model', () => {
    const ch1 = channelManager.register('SEO', 'organic_search', 0);
    const ch2 = channelManager.register('Email', 'email', 2000);
    const touchpoints = [
      { channelId: ch1.channelId, channelName: 'SEO', timestamp: Date.now() - 86400000 },
      { channelId: ch2.channelId, channelName: 'Email', timestamp: Date.now() - 3600000 }
    ];
    const attribution = attributionEngine.attribute('conv-001', 'last_click', touchpoints, 500, Date.now());
    expect(attribution.attributedRevenue[ch2.channelId]).toBe(500);
    expect(attribution.attributedRevenue[ch1.channelId]).toBe(0);
    expect(attribution.pathLength).toBe(2);
  });

  it('optimizes channel mix and identifies budget reallocation', () => {
    const ch = channelManager.register('Display', 'display', 5000);
    channelManager.updateMetrics(ch.channelId, 5000, 50000, 1000, 20, 5000);
    const allChannels = channelManager.getAll();
    const mix = channelMixOptimizer.optimize('2025-Q1', allChannels);
    expect(mix.mixId).toMatch(/^mix-/);
    expect(mix.channelAllocations.length).toBeGreaterThan(0);
    expect(mix.totalBudgetUSD).toBeGreaterThanOrEqual(0);
  });

  it('analyzes channel funnel and identifies top drop-off stage', () => {
    const ch = channelManager.register('Social', 'social', 3000);
    const funnel = channelFunnelAnalyzer.analyze(ch.channelId, 'Social', '2025-Q1', 100000, 5000, 2000, 500, 100);
    expect(funnel.funnelId).toMatch(/^funnel-/);
    expect(funnel.overallFunnelConversionPct).toBeCloseTo(0.1, 1);
    expect(funnel.topDropOffStage).toBeTruthy();
  });
});

// ─── Phase 319: Project Portfolio ─────────────────────────────────────────────

describe('Phase 319: Project Portfolio Intelligence', () => {
  it('registers project and calculates RAG status on progress update', () => {
    const portfolio = portfolioManager.register('Digital Transformation', 'CTO', 5000000);
    const project = projectManager.register('API Modernization', portfolio.portfolioId, 'strategic', 'high', 500000, Date.now(), Date.now() + 180 * 86400000, 8, 'pm-001', 90, 85, 200);
    projectManager.updateProgress(project.projectId, 50, 280000, 10);
    expect(project.completionPct).toBe(50);
    expect(project.ragStatus).toBe('amber'); // 10 days late > 7, not > 14
  });

  it('refreshes portfolio health from projects', () => {
    const portfolio = portfolioManager.register('Innovation Hub', 'CTO', 2000000);
    const p = projectManager.register('ML Platform', portfolio.portfolioId, 'innovation', 'medium', 300000, Date.now(), Date.now() + 90 * 86400000, 5, 'pm-002', 75, 80, 150);
    projectManager.updateProgress(p.projectId, 30, 100000, 0);
    const allProjects = projectManager.getAll();
    portfolioManager.refresh(portfolio.portfolioId, allProjects);
    const updated = portfolioManager.getPortfolio(portfolio.portfolioId)!;
    expect(updated.projectCount).toBeGreaterThan(0);
    expect(updated.portfolioHealthScore).toBeGreaterThan(0);
  });

  it('detects over-allocation of resources', () => {
    const alloc1 = resourceAllocationManager.allocate('dev-01', 'Senior Dev', 'human', 'proj-001', 'API', 70, Date.now(), Date.now() + 60 * 86400000);
    const alloc2 = resourceAllocationManager.allocate('dev-01', 'Senior Dev', 'human', 'proj-002', 'UI', 60, Date.now(), Date.now() + 60 * 86400000);
    expect(alloc1.allocationPct).toBe(70);
    // Total allocation is 130% — but isOverAllocated is per-record
    const total = resourceAllocationManager.getTotalAllocationByResource('dev-01');
    expect(total).toBe(130);
  });

  it('calculates delivery metrics and on-time percentage', () => {
    const portfolio = portfolioManager.register('Ops', 'COO', 1000000);
    const p1 = projectManager.register('Proj1', portfolio.portfolioId, 'operational', 'medium', 100000, Date.now() - 200 * 86400000, Date.now() - 10 * 86400000, 3, 'pm-003', 60, 70, 100);
    projectManager.updateProgress(p1.projectId, 100, 95000, -5); // on time
    const metrics = deliveryMetricsAnalyzer.calculate('2025-Q1', projectManager.getAll());
    expect(metrics.metricsId).toMatch(/^delvmet-/);
    expect(metrics.totalProjects).toBeGreaterThan(0);
  });
});

// ─── Phase 320: Customer Health ───────────────────────────────────────────────

describe('Phase 320: Customer Health Intelligence', () => {
  it('calculates composite customer health score and churn risk', () => {
    const health = customerHealthEngine.calculate('cust-001', 'Acme Corp', 'enterprise', 80, 90, 75, 100, 70, 85, 120000, 5, 1, 0, 20, 80);
    expect(health.healthId).toMatch(/^health-/);
    expect(health.healthScore).toBeGreaterThan(0);
    expect(health.healthCategory).toBe('healthy');
    expect(health.churnRiskCategory).toBe('low');
  });

  it('predicts churn probability and generates recommended actions', () => {
    const health = customerHealthEngine.calculate('cust-002', 'Risk Co', 'smb', 20, 40, 30, 50, 30, 25, 24000, 45, 5, 2, 1, 15);
    const prediction = churnPredictor.predict(health);
    expect(prediction.predictionId).toMatch(/^churnpred-/);
    expect(prediction.churnProbabilityPct).toBeGreaterThan(50);
    expect(prediction.recommendedActions.length).toBeGreaterThan(0);
    expect(prediction.topRiskFactors.length).toBeGreaterThan(0);
  });

  it('detects expansion signals with pipeline value', () => {
    const signal = expansionSignalDetector.detect('cust-001', 'Acme Corp', 'usage_limit_approaching', 'strong', 30000, ['Usage at 95% of plan limit'], 'Upgrade to Enterprise plan', 'Enterprise Plus');
    expect(signal.signalId).toMatch(/^expsig-/);
    expect(signal.expansionOpportunityUSD).toBe(30000);
    expect(expansionSignalDetector.getTotalExpansionPipeline()).toBeGreaterThan(0);
  });

  it('tracks lifecycle stage transitions', () => {
    const stage = lifecycleStageManager.setStage('cust-001', 'Acme Corp', 'established', 82, 'Achieve 90% feature adoption', 30, 'csm-001');
    expect(stage.stageId).toMatch(/^lifecycle-/);
    expect(stage.currentStage).toBe('established');
    expect(stage.isOnTrack).toBe(true);
    // Advance to expanding
    const expanded = lifecycleStageManager.setStage('cust-001', 'Acme Corp', 'expanding', 88, 'Renew contract', 60, 'csm-001');
    expect(expanded.previousStage).toBe('established');
  });
});

// ─── Phase 321: Network & Infrastructure ──────────────────────────────────────

describe('Phase 321: Network & Infrastructure Intelligence', () => {
  it('registers network node and updates metrics with health score', () => {
    const node = networkNodeManager.register('web-server-01', 'server', 'us-east-1', '10.0.1.10', ['prod', 'web']);
    networkNodeManager.updateMetrics(node.nodeId, 75, 60, 50, 100, 80);
    const updated = networkNodeManager.getNode(node.nodeId)!;
    expect(updated.cpuUsagePct).toBe(75);
    expect(updated.healthScore).toBeLessThan(100); // penalized for 75% CPU
    expect(updated.status).toBe('online');
  });

  it('analyzes bandwidth and detects capacity breach', () => {
    const node = networkNodeManager.register('edge-router-01', 'router', 'eu-west-1', '192.168.1.1');
    const bw = bandwidthAnalyzer.analyze(node.nodeId, 'edge-router-01', '2025-Q1', 850, 750, 950, 900, 1000, 0.1, 15, 2, 0.001);
    expect(bw.bandwidthId).toMatch(/^bw-/);
    expect(bw.utilizationPct).toBeGreaterThan(80);
    expect(bw.isCapacityBreached).toBe(true);
  });

  it('plans capacity and recommends action based on growth rate', () => {
    const plan = capacityPlanner.plan('cpu', 100, 85, 5, 500);  // 5% monthly growth, 85% utilized
    expect(plan.planId).toMatch(/^capplan-/);
    expect(plan.utilizationPct).toBe(85);
    expect(plan.daysToCapacityExhaustion).toBeGreaterThan(0);
    expect(['monitor', 'plan_expansion', 'urgent_expansion', 'immediate_action']).toContain(plan.recommendedAction);
  });

  it('triggers and resolves infrastructure alerts', () => {
    const node = networkNodeManager.register('db-server-01', 'server', 'us-east-1', '10.0.2.10');
    const alert = infrastructureAlertManager.trigger(node.nodeId, 'db-server-01', 'cpu_high', 'critical', 'cpuUsagePct', 95, 80, 'Database queries degraded', 'Scale up or optimize queries');
    expect(alert.alertId).toMatch(/^infralert-/);
    expect(alert.severity).toBe('critical');
    infrastructureAlertManager.resolve(alert.alertId);
    expect(infrastructureAlertManager.getActiveAlerts().find(a => a.alertId === alert.alertId)).toBeUndefined();
  });
});

// ─── Phase 322: Sustainability ─────────────────────────────────────────────────

describe('Phase 322: Sustainability Intelligence', () => {
  it('records carbon emissions by scope with offset calculation', () => {
    const emission = carbonTracker.record('facility-001', 'HQ Office', 'scope2', 'energy', 500000, 'kWh', 0.000233, '2025-Q1', false, 50);
    expect(emission.emissionId).toMatch(/^emission-/);
    expect(emission.co2eTonnes).toBeCloseTo(116.5, 0);
    expect(emission.netCo2eTonnes).toBe(Math.max(0, emission.co2eTonnes - 50));
  });

  it('tracks ESG metric progress and RAG status', () => {
    const metric = esgMetricsManager.define('Carbon Intensity', 'environmental', 'tCO2e/$M revenue', 100, 2020, 50, 'TCFD');
    esgMetricsManager.update(metric.metricId, 70); // moved from 100 toward 50
    const updated = esgMetricsManager.getAll().find(m => m.metricId === metric.metricId)!;
    // Progress = (100-70)/(100-50) = 60% — amber
    expect(updated.progressPct).toBeCloseTo(60, 0);
    expect(updated.ragStatus).toBe('amber');
  });

  it('records energy usage and calculates CO2e', () => {
    const usage = energyManager.record('fac-001', 'Data Center', '2025-Q1', 1000000, 300000, 50, 10000, 120000, ['ISO 50001']);
    expect(usage.usageId).toMatch(/^energy-/);
    expect(usage.renewableEnergyPct).toBe(30);
    expect(usage.co2eTonnes).toBeGreaterThan(0);
    expect(usage.certifications).toContain('ISO 50001');
  });

  it('generates sustainability report with aggregated ESG scores', () => {
    const emissions = carbonTracker.getAll();
    const esgMetrics = esgMetricsManager.getAll();
    const energyRecords = energyManager.getAll();
    const report = sustainabilityReportGenerator.generate('2025-Annual', 'GRI', emissions, esgMetrics, energyRecords, 50000000, ['Reduced emissions by 15%'], ['Climate regulation risk'], [{ name: 'Net Zero', targetYear: 2040, progressPct: 20 }]);
    expect(report.reportId).toMatch(/^susrep-/);
    expect(report.framework).toBe('GRI');
    expect(report.totalCo2eTonnes).toBeGreaterThan(0);
  });
});
