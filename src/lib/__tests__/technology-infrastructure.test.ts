/**
 * Tests for Phase 245-250: Advanced Technology & Infrastructure Intelligence
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Phase 245: Technology Portfolio Management
import { techAssetInventory, techLifecycleTracker, vendorDependencyAnalyzer, techRoadmapManager } from '../technology-portfolio-management';

// Phase 246: Technical Debt Intelligence
import { technicalDebtRegister, debtRemediationTracker, debtCostCalculator, techHealthScorer } from '../technical-debt-intelligence';

// Phase 247: Architecture Intelligence
import { serviceRegistry, serviceDependencyMapper, architectureHealthAnalyzer, adrManager } from '../architecture-intelligence';

// Phase 248: API Lifecycle Management
import { apiInventoryManager, apiVersionGovernor, apiDeprecationManager, apiHealthReporter } from '../api-lifecycle-management';

// Phase 249: Platform Engineering Intelligence
import { platformServiceRegistry, goldenPathManager, developerExperienceTracker, platformIncidentTracker } from '../platform-engineering-intelligence';

// Phase 250: Infrastructure Cost Intelligence
import { cloudCostTracker, costAllocationEngine, wasteDetector, costOptimizationAdvisor } from '../infrastructure-cost-intelligence';

describe('Phase 245: Technology Portfolio Management', () => {
  it('adds tech assets and calculates total annual cost', () => {
    const asset1 = techAssetInventory.add('Kubernetes', 'platform', 'CNCF', '1.29', 'open_source', 0, 12, 'critical');
    const asset2 = techAssetInventory.add('OldOracle', 'platform', 'Oracle', '11g', 'commercial', 200000, 2, 'legacy');
    expect(asset1.lifecycleStage).toBe('growth');
    expect(asset2.lifecycleStage).toBe('declining');
    const total = techAssetInventory.getTotalAnnualCost();
    expect(total).toBe(200000);
  });

  it('records lifecycle events and retrieves asset history', () => {
    const asset = techAssetInventory.add('React', 'library', 'Meta', '18', 'open_source', 0, 20, 'important');
    techLifecycleTracker.record(asset.assetId, 'adopted', 'Initial adoption', undefined, '18.0');
    techLifecycleTracker.record(asset.assetId, 'upgraded', 'Upgrade to 18.2', '18.0', '18.2');
    const history = techLifecycleTracker.getAssetHistory(asset.assetId);
    expect(history).toHaveLength(2);
    expect(history[0].eventType).toBe('adopted');
  });

  it('analyzes vendor dependency risk correctly', () => {
    const dep = vendorDependencyAnalyzer.analyze('SingleVendor', ['asset1'], 150000, Date.now() + 86400000 * 60, []);
    expect(dep.singleSourceRisk).toBe(true);
    expect(dep.riskLevel).toBe('critical');
    const critical = vendorDependencyAnalyzer.getCriticalDependencies();
    expect(critical.length).toBeGreaterThan(0);
  });

  it('creates roadmap items and filters by type', () => {
    const item = techRoadmapManager.add('Adopt Rust', 'adopt', 'Rust', 'Performance critical services', 'Q3-2026', 'high', 'Faster processing');
    expect(item.status).toBe('planned');
    const adopts = techRoadmapManager.getByType('adopt');
    expect(adopts.some(i => i.technology === 'Rust')).toBe(true);
  });
});

describe('Phase 246: Technical Debt Intelligence', () => {
  it('registers debt and accrues interest over time', () => {
    const debt = technicalDebtRegister.register('Legacy Auth Module', 'No JWT refresh logic', 'security', 'critical', 80, ['auth-service'], 'security-team');
    expect(debt.interestRatePerMonth).toBe(0.1);
    expect(debt.accruedCost).toBe(80);
    technicalDebtRegister.accrueInterest();
    // accruedCost should remain >= 80 (no time has passed meaningfully in test)
    expect(technicalDebtRegister.getTotalAccruedCost()).toBeGreaterThanOrEqual(80);
  });

  it('tracks debt remediation plans and completion rate', () => {
    const debt = technicalDebtRegister.register('Missing Tests', 'Core module lacks unit tests', 'test', 'high', 40, ['core'], 'dev-team');
    const plan = debtRemediationTracker.plan(debt.debtId, 'Sprint-12', 'backend-team', 40);
    expect(plan.status).toBe('planned');
    debtRemediationTracker.updateProgress(plan.planId, 100, 38);
    expect(debtRemediationTracker.getCompletionRate()).toBeGreaterThan(0);
  });

  it('calculates debt cost with slowdown overhead', () => {
    const debt = technicalDebtRegister.register('Monolith Split', 'Need microservices split', 'architecture', 'medium', 200, ['monolith'], 'arch-team');
    const items = [debt];
    const estimate = debtCostCalculator.calculate('Q2-2026', items, 1000, 100);
    expect(estimate.estimatedSlowdownCost).toBe(estimate.estimatedRemediationCost * 0.3);
    expect(estimate.totalDebtCost).toBe(estimate.estimatedRemediationCost + estimate.estimatedSlowdownCost);
  });

  it('scores tech health and identifies unhealthy services', () => {
    techHealthScorer.score('payment-service', 40, 35, 50, 45);
    techHealthScorer.score('healthy-service', 90, 85, 88, 92);
    const unhealthy = techHealthScorer.getUnhealthyServices(60);
    expect(unhealthy.some(s => s.service === 'payment-service')).toBe(true);
    expect(unhealthy.every(s => s.overallHealthScore < 60)).toBe(true);
  });
});

describe('Phase 247: Architecture Intelligence', () => {
  it('registers services and finds critical ones', () => {
    const svc = serviceRegistry.register('Order Service', 'microservice', 'commerce-team', 'TypeScript', 'order-svc', 99.9, 'critical');
    expect(svc.criticalityLevel).toBe('critical');
    const critical = serviceRegistry.getCriticalServices();
    expect(critical.some(s => s.serviceId === svc.serviceId)).toBe(true);
  });

  it('maps dependencies and detects high-error ones', () => {
    const from = serviceRegistry.register('API Gateway', 'gateway', 'platform', 'Go', 'gateway', 99.99, 'critical');
    const to = serviceRegistry.register('Product Service', 'microservice', 'catalog', 'Python', 'product-svc', 99.5, 'high');
    const dep = serviceDependencyMapper.map(from.serviceId, to.serviceId, 'sync', 'blocking', 20);
    serviceDependencyMapper.updateErrorRate(dep.dependencyId, 8);
    const highErr = serviceDependencyMapper.getHighErrorDependencies(5);
    expect(highErr.some(d => d.dependencyId === dep.dependencyId)).toBe(true);
  });

  it('analyzes architecture health with weighted scoring', () => {
    const score = architectureHealthAnalyzer.analyze('2026-Q2', 80, 75, 70, 85, 65, ['Coupling could improve']);
    const expected = 80 * 0.2 + 75 * 0.2 + 70 * 0.2 + 85 * 0.25 + 65 * 0.15;
    expect(score.overallScore).toBeCloseTo(expected, 1);
    expect(score.findings).toHaveLength(1);
  });

  it('creates and accepts ADRs with supersede tracking', () => {
    const adr1 = adrManager.create('Use REST APIs', 'API style choice', 'Adopt REST for all new endpoints', ['Familiar to team'], ['GraphQL', 'gRPC'], 'arch-team');
    adrManager.accept(adr1.adrId);
    const adr2 = adrManager.create('Use GraphQL', 'Performance needs', 'Migrate to GraphQL for complex queries', ['Better DX'], ['REST'], 'arch-team');
    adrManager.supersede(adr1.adrId, adr2.adrId);
    const updated = adrManager.getADR(adr1.adrId);
    expect(updated?.status).toBe('superseded');
    expect(updated?.supersededBy).toBe(adr2.adrId);
  });
});

describe('Phase 248: API Lifecycle Management', () => {
  it('registers endpoints and marks as deprecated', () => {
    const ep = apiInventoryManager.register('/api/v1/users', 'GET', 'v1', 'user-service', true, 100);
    expect(ep.status).toBe('active');
    apiInventoryManager.deprecate(ep.endpointId);
    expect(apiInventoryManager.getAllEndpoints().find(e => e.endpointId === ep.endpointId)?.status).toBe('deprecated');
  });

  it('tracks API versions and marks older as supported', () => {
    const v1 = apiVersionGovernor.register('billing-api', 'v1', [], 'No migration needed', 5);
    const v2 = apiVersionGovernor.register('billing-api', 'v2', ['Changed response schema'], 'Update field names', 3);
    expect(v2.status).toBe('current');
    const history = apiVersionGovernor.getVersionHistory('billing-api');
    expect(history.find(v => v.version === 'v1')?.status).toBe('supported');
  });

  it('creates deprecation notices and finds upcoming retirements', () => {
    const ep = apiInventoryManager.register('/api/v1/legacy', 'POST', 'v1', 'legacy-service', false, 50);
    const retirementDate = Date.now() + 30 * 86400 * 1000;  // 30 days
    apiDeprecationManager.notify(ep.endpointId, 'legacy-api', 'v1', 'v2', Date.now(), retirementDate, ['service-a', 'service-b'], ['Update client', 'Test']);
    const upcoming = apiDeprecationManager.getUpcomingRetirements(60);
    expect(upcoming.some(n => n.endpointId === ep.endpointId)).toBe(true);
    expect(apiDeprecationManager.getTotalAffectedConsumers()).toBeGreaterThan(0);
  });

  it('generates API health report with SLA breach detection', () => {
    const ep1 = apiInventoryManager.register('/api/v2/orders', 'GET', 'v2', 'order-service', true, 200);
    apiInventoryManager.updateMetrics(ep1.endpointId, 150, 2500, 0.5, 10000);  // p99 > 2000 = SLA breach
    const report = apiHealthReporter.generate('2026-04', apiInventoryManager.getAllEndpoints());
    expect(report.slaBreaches).toBeGreaterThan(0);
    expect(report.totalEndpoints).toBeGreaterThan(0);
  });
});

describe('Phase 249: Platform Engineering Intelligence', () => {
  it('registers platform services and tracks adoption', () => {
    const svc = platformServiceRegistry.register('CI Pipeline', 'ci_cd', 'platform-team', '2.0');
    expect(svc.status).toBe('beta');
    platformServiceRegistry.updateMetrics(svc.serviceId, 8, 99.5, 200);
    platformServiceRegistry.promoteToStable(svc.serviceId);
    expect(platformServiceRegistry.getAllServices().find(s => s.serviceId === svc.serviceId)?.status).toBe('stable');
  });

  it('creates golden path templates and tracks compliance rate', () => {
    const t1 = goldenPathManager.create('Node Service', 'TypeScript', 'Express', true, true, true);
    const t2 = goldenPathManager.create('Legacy Template', 'JavaScript', 'Express', false, false, false);
    goldenPathManager.recordUsage(t1.templateId);
    goldenPathManager.recordUsage(t1.templateId);
    const compliance = goldenPathManager.getComplianceRate();
    expect(compliance).toBe(50);  // 1 of 2 fully compliant
    expect(goldenPathManager.getTopTemplates()[0].templateId).toBe(t1.templateId);
  });

  it('records DX metrics and identifies low DX teams', () => {
    developerExperienceTracker.record('team-poor', 'April', 60, 30, 1, 20, 480);
    developerExperienceTracker.record('team-good', 'April', 95, 5, 10, 2, 15);
    const lowDX = developerExperienceTracker.getLowestDXTeams(70);
    expect(lowDX.some(m => m.team === 'team-poor')).toBe(true);
    expect(lowDX.every(m => m.dxScore < 70)).toBe(true);
  });

  it('tracks platform incidents and calculates MTTR', () => {
    const inc = platformIncidentTracker.open('ci-svc', 'Build queue stuck', 'p2', ['team-a', 'team-b']);
    expect(inc.status).toBe('open');
    platformIncidentTracker.resolve(inc.incidentId, 'Memory leak in queue worker');
    const open = platformIncidentTracker.getOpenIncidents();
    expect(open.every(i => i.incidentId !== inc.incidentId)).toBe(true);
    expect(platformIncidentTracker.getAvgMTTR()).toBeGreaterThanOrEqual(0);
  });
});

describe('Phase 250: Infrastructure Cost Intelligence', () => {
  it('tracks cloud resource costs and aggregates by environment', () => {
    cloudCostTracker.record('prod-k8s-cluster', 'compute', 'aws', 'platform-team', 'production', 500, 75);
    cloudCostTracker.record('dev-k8s-cluster', 'compute', 'aws', 'platform-team', 'development', 100, 15);
    const byEnv = cloudCostTracker.getCostByEnvironment();
    expect(byEnv['production']).toBe(500 * 30);
    expect(byEnv['development']).toBe(100 * 30);
    const low = cloudCostTracker.getLowUtilization(20);
    expect(low.some(r => r.resourceName === 'dev-k8s-cluster')).toBe(true);
  });

  it('allocates costs to teams and identifies over-budget teams', () => {
    const alloc = costAllocationEngine.allocate('April-2026', 'frontend-team', 2000, 500, 200, 800, 3000, 1000000);
    expect(alloc.totalCost).toBe(3500);
    expect(alloc.variancePct).toBeCloseTo(((3500 - 3000) / 3000) * 100, 1);
    const overBudget = costAllocationEngine.getOverBudgetTeams(10);
    expect(overBudget.some(a => a.team === 'frontend-team')).toBe(true);
  });

  it('detects waste and prioritizes by potential savings', () => {
    const w1 = wasteDetector.detect('res-1', 'Idle DB Server', 'idle_compute', 5, 5000, 'Downsize or terminate');
    const w2 = wasteDetector.detect('res-2', 'Small Dev Box', 'oversized', 10, 100, 'Rightsize instance');
    expect(w1.priority).not.toBe(w2.priority);  // Large server has higher priority
    const top = wasteDetector.getTopWaste(5);
    expect(top[0].potentialSavings).toBeGreaterThanOrEqual(top[1].potentialSavings);
    expect(wasteDetector.getTotalWastePerMonth()).toBeGreaterThan(0);
  });

  it('generates cost optimization recommendations and identifies quick wins', () => {
    const rec = costOptimizationAdvisor.recommend('reserved_instances', 'Purchase 1yr Reserved EC2', 'Switch on-demand to reserved', 30000, 'low', 'low', ['prod-web-1', 'prod-web-2']);
    expect(rec.status).toBe('open');
    const quickWins = costOptimizationAdvisor.getQuickWins();
    expect(quickWins.some(r => r.recommendationId === rec.recommendationId)).toBe(true);
    expect(costOptimizationAdvisor.getTotalPotentialSavings()).toBeGreaterThan(0);
  });
});
