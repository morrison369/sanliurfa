/**
 * Advanced Data Mesh & Data Products (Phase 179-184)
 * Test suite for data domain ownership, product catalog, contracts,
 * self-serve analytics, lineage, and quality SLAs
 */

import { describe, it, expect } from 'vitest';
import {
  dataDomainRegistry, dataDomainGovernor, dataDomainMetricsCollector, dataDomainLineageTracker,
  dataProductRegistry, dataProductVersionManager, dataProductDiscovery, dataProductRatingSystem,
  dataContractManager, dataContractValidator, dataContractMonitor, dataContractBreachHandler,
  queryBuilder, analyticsWorkspaceManager, metricsDefinitionRegistry, analyticsDashboardManager,
  lineageGraphBuilder, transformationTracker, provenanceManager, impactAnalyzer,
  slaDefinitionManager, slaMonitor, slaBreachNotifier, slaReporter
} from '../index';

// Phase 179: Data Domain Ownership
describe('Phase 179: Data Domain Ownership', () => {
  it('should register domains with ownership and transfer', () => {
    const domain = dataDomainRegistry.register('orders', 'Order processing domain', 'alice@co', ['alice', 'bob'], ['ecommerce']);
    expect(domain.domainId).toBeDefined();
    expect(domain.owner).toBe('alice@co');

    const transferred = dataDomainRegistry.transferOwnership(domain.domainId, 'charlie@co');
    expect(transferred?.owner).toBe('charlie@co');
  });

  it('should define and evaluate domain policies', () => {
    const domain = dataDomainRegistry.register('payments', 'Payment data domain', 'finance@co', ['finance-team']);
    dataDomainGovernor.definePolicy(domain.domainId, 'access', { clearanceLevel: 'confidential' });

    const allowed = dataDomainGovernor.evaluate(domain.domainId, { clearanceLevel: 'confidential' });
    expect(allowed.allowed).toBe(true);

    const denied = dataDomainGovernor.evaluate(domain.domainId, { clearanceLevel: 'public' });
    expect(denied.allowed).toBe(false);
    expect(denied.violations.length).toBeGreaterThan(0);
  });

  it('should collect domain health metrics', () => {
    const domain = dataDomainRegistry.register('users', 'User domain', 'platform@co', []);
    const metric = dataDomainMetricsCollector.record(domain.domainId, 98, 95, 97, 99.5);
    expect(metric.overallHealth).toBeGreaterThan(90);

    const latest = dataDomainMetricsCollector.getLatest(domain.domainId);
    expect(latest?.domainId).toBe(domain.domainId);
  });

  it('should track domain lineage and impact', () => {
    dataDomainLineageTracker.recordDependency('domain-raw', 'domain-processed', 'transforms');
    dataDomainLineageTracker.recordDependency('domain-processed', 'domain-reports', 'produces');

    const downstream = dataDomainLineageTracker.getDownstream('domain-raw');
    expect(downstream).toContain('domain-processed');

    const impacted = dataDomainLineageTracker.getImpactedDomains('domain-raw');
    expect(impacted).toContain('domain-reports');
  });
});

// Phase 180: Data Product Catalog
describe('Phase 180: Data Product Catalog', () => {
  it('should register and publish data products', () => {
    const product = dataProductRegistry.register(
      'user-events',
      'domain-users',
      'alice@co',
      { userId: 'string', eventType: 'string', timestamp: 'number' },
      { type: 'api', endpoint: '/api/data/user-events' },
      { freshnessHours: 1, availabilityPct: 99.9 },
      ['events', 'users']
    );

    expect(product.status).toBe('draft');
    const published = dataProductRegistry.publish(product.productId);
    expect(published?.status).toBe('published');
  });

  it('should version data products', () => {
    const product = dataProductRegistry.register(
      'order-facts', 'domain-orders', 'bob@co',
      { orderId: 'string', amount: 'number' },
      { type: 'table', endpoint: 'warehouse.orders.facts' },
      { freshnessHours: 24, availabilityPct: 99 }
    );

    const v1 = dataProductVersionManager.createVersion(product.productId, '1.0.0', 'Initial version', { orderId: 'string' });
    const v2 = dataProductVersionManager.createVersion(product.productId, '2.0.0', 'Added amount field', { orderId: 'string', amount: 'number' });

    expect(v2.version).toBe('2.0.0');
    const latest = dataProductVersionManager.getLatestVersion(product.productId);
    expect(latest?.version).toBe('2.0.0');
  });

  it('should discover data products by search and tags', () => {
    const published = dataProductRegistry.getPublished();
    const results = dataProductDiscovery.search(published, 'user');
    expect(Array.isArray(results)).toBe(true);

    const byTag = dataProductDiscovery.filterByTag(published, 'events');
    expect(Array.isArray(byTag)).toBe(true);
  });

  it('should rate data products', () => {
    const published = dataProductRegistry.getPublished();
    if (published.length === 0) return;

    const productId = published[0].productId;
    dataProductRatingSystem.rate(productId, 'user-001', 5, 'Excellent data quality');
    dataProductRatingSystem.rate(productId, 'user-002', 4, 'Good but could be fresher');

    const rating = dataProductRatingSystem.getAverageRating(productId);
    expect(rating.count).toBe(2);
    expect(rating.score).toBe(4.5);
  });
});

// Phase 181: Data Contracts
describe('Phase 181: Data Contracts', () => {
  it('should create and activate data contracts', () => {
    const contract = dataContractManager.create(
      'orders-to-finance',
      'domain-orders',
      'domain-finance',
      { orderId: { type: 'string', nullable: false }, amount: { type: 'number', nullable: false } },
      { freshnessHours: 4, availabilityPct: 99.5, latencyMs: 500 }
    );

    expect(contract.status).toBe('draft');
    const activated = dataContractManager.activate(contract.contractId);
    expect(activated?.status).toBe('active');
  });

  it('should validate data against contract schema', () => {
    const contract = dataContractManager.create(
      'test-contract', 'domain-a', 'domain-b',
      { id: { type: 'string', nullable: false }, value: { type: 'number', nullable: true } },
      { freshnessHours: 1, availabilityPct: 99, latencyMs: 200 }
    );
    dataContractManager.activate(contract.contractId);

    const validResult = dataContractValidator.validate(contract, { id: 'abc-123', value: 42 });
    expect(validResult.valid).toBe(true);
    expect(validResult.violations.filter(v => v.severity === 'error').length).toBe(0);

    const invalidResult = dataContractValidator.validate(contract, { id: null as any });
    expect(invalidResult.valid).toBe(false);
  });

  it('should monitor SLA compliance', () => {
    const contracts = dataContractManager.getActiveContracts();
    if (!contracts.length) return;

    const contract = contracts[0];
    dataContractMonitor.recordSLAMetrics(contract.contractId, 2, 99.8, 150);

    const compliance = dataContractMonitor.checkSLACompliance(contract);
    expect(compliance).toHaveProperty('compliant');
    expect(Array.isArray(compliance.violations)).toBe(true);
  });

  it('should report and resolve contract breaches', () => {
    const breach = dataContractBreachHandler.reportBreach(
      'contract-001', 'schema', 'Field "orderId" missing in 15% of records', 'high'
    );

    expect(breach.breachId).toBeDefined();
    expect(breach.severity).toBe('high');

    const resolved = dataContractBreachHandler.resolveBreach(breach.breachId);
    expect(resolved?.resolvedAt).toBeDefined();
  });
});

// Phase 182: Self-serve Analytics
describe('Phase 182: Self-serve Analytics', () => {
  it('should build and save analytics queries', () => {
    const qb = queryBuilder.build('daily-orders', 'dp-orders', 'analyst@co');
    const saved = qb.select(['orderId', 'amount', 'status'])
      .where('status', '=', 'completed')
      .groupBy(['status'])
      .orderBy('amount', 'desc')
      .limit(500)
      .save();

    expect(saved.queryId).toBeDefined();
    expect(saved.select).toContain('orderId');
    expect(saved.filters.length).toBe(1);
  });

  it('should manage analytics workspaces', () => {
    const workspace = analyticsWorkspaceManager.create('Marketing Analytics', 'marketer@co');
    expect(workspace.workspaceId).toBeDefined();

    const qb = queryBuilder.build('ctr-analysis', 'dp-events', 'marketer@co');
    const q = qb.select(['campaign', 'clicks', 'impressions']).save();

    analyticsWorkspaceManager.addQuery(workspace.workspaceId, q.queryId);
    const ws = analyticsWorkspaceManager.getWorkspace(workspace.workspaceId);
    expect(ws?.savedQueries).toContain(q.queryId);
  });

  it('should define and search metrics', () => {
    const metric = metricsDefinitionRegistry.define(
      'conversion_rate', 'Percentage of users who converted',
      'conversions / visitors * 100',
      'dp-events', ['channel', 'campaign'], '%', 'growth@co'
    );

    expect(metric.metricId).toBeDefined();

    const found = metricsDefinitionRegistry.search('conversion');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].name).toContain('conversion');
  });

  it('should create and manage dashboards', () => {
    const metric = metricsDefinitionRegistry.define('revenue', 'Total revenue', 'SUM(amount)', 'dp-orders', ['day'], 'USD', 'finance@co');
    const dashboard = analyticsDashboardManager.create('Revenue Dashboard', 'finance@co', [metric.metricId]);

    expect(dashboard.metricIds).toContain(metric.metricId);

    analyticsDashboardManager.recordView(dashboard.dashboardId);
    const mostViewed = analyticsDashboardManager.getMostViewed(5);
    expect(mostViewed.some(d => d.dashboardId === dashboard.dashboardId)).toBe(true);
  });
});

// Phase 183: Data Lineage & Provenance
describe('Phase 183: Data Lineage & Provenance', () => {
  it('should build lineage graph and traverse', () => {
    const source = lineageGraphBuilder.addNode('source', 'Raw Events DB', 'domain-events');
    const transform = lineageGraphBuilder.addNode('transformation', 'Event Aggregator');
    const product = lineageGraphBuilder.addNode('product', 'Daily Events Summary', 'domain-analytics');

    lineageGraphBuilder.addEdge(source.nodeId, transform.nodeId, 'filter');
    lineageGraphBuilder.addEdge(transform.nodeId, product.nodeId, 'aggregate');

    const upstream = lineageGraphBuilder.getUpstreamLineage(product.nodeId);
    expect(upstream.length).toBeGreaterThanOrEqual(1);

    const downstream = lineageGraphBuilder.getDownstreamLineage(source.nodeId);
    expect(downstream.length).toBeGreaterThanOrEqual(1);
  });

  it('should track data transformations', () => {
    transformationTracker.record('dp-001', 'filter-nulls', 'filter', 10000, 9800, 150);
    transformationTracker.record('dp-001', 'aggregate-daily', 'aggregate', 9800, 365, 800);

    const history = transformationTracker.getTransformationHistory('dp-001');
    expect(history.length).toBe(2);

    const reductionRate = transformationTracker.getDataReductionRate('dp-001');
    expect(reductionRate).toBeGreaterThan(90);
  });

  it('should capture and verify data provenance', () => {
    const record = provenanceManager.capture('dp-orders', ['source-db', 'erp-api'], ['filter', 'join', 'aggregate'], 'order-data-snapshot');
    expect(record.recordId).toBeDefined();
    expect(record.sourceNodes.length).toBe(2);

    const verified = provenanceManager.verifyIntegrity(record.recordId, 'order-dat');
    expect(typeof verified).toBe('boolean');
  });

  it('should analyze impact of upstream changes', () => {
    const source = lineageGraphBuilder.addNode('source', 'Orders DB');
    const product1 = lineageGraphBuilder.addNode('product', 'Order Summary');
    const product2 = lineageGraphBuilder.addNode('product', 'Revenue Report');
    const consumer = lineageGraphBuilder.addNode('consumer', 'BI Dashboard');

    lineageGraphBuilder.addEdge(source.nodeId, product1.nodeId, 'derive');
    lineageGraphBuilder.addEdge(product1.nodeId, product2.nodeId, 'join');
    lineageGraphBuilder.addEdge(product2.nodeId, consumer.nodeId, 'copy');

    const impact = impactAnalyzer.analyzeUpstreamChange(source.nodeId, lineageGraphBuilder);
    expect(impact.affectedNodes.length).toBeGreaterThan(0);
    expect(impact.riskLevel).toMatch(/low|medium|high/);
  });
});

// Phase 184: Data Quality SLAs
describe('Phase 184: Data Quality SLAs', () => {
  it('should define SLAs and measure compliance', () => {
    const sla = slaDefinitionManager.define(
      'dp-users', 'User Data Quality SLA',
      { completeness: 99, accuracy: 98, timeliness: 95 }
    );

    expect(sla.slaId).toBeDefined();
    expect(sla.status).toBe('active');

    const measurement = slaMonitor.measure(sla, { completeness: 99.5, accuracy: 98.2, timeliness: 96 });
    expect(measurement.compliant).toBe(true);
    expect(measurement.overallScore).toBeGreaterThan(95);
  });

  it('should detect SLA breaches and notify', () => {
    const sla = slaDefinitionManager.define(
      'dp-orders', 'Order Data Quality',
      { completeness: 98, accuracy: 97 }
    );
    slaDefinitionManager.setThresholds(sla.slaId, 95, 90);

    const measurement = slaMonitor.measure(sla, { completeness: 91, accuracy: 92 });
    expect(measurement.compliant).toBe(false);

    const breaches = slaBreachNotifier.detectAndReport(sla, measurement);
    expect(breaches.length).toBeGreaterThan(0);

    if (breaches.length > 0) {
      const notified = slaBreachNotifier.notify(breaches[0].breachId, 'slack');
      expect(notified).toBe(true);
    }
  });

  it('should resolve breaches and track open issues', () => {
    const sla = slaDefinitionManager.define('dp-test', 'Test SLA', { accuracy: 95 });
    const measurement = slaMonitor.measure(sla, { accuracy: 80 });
    const breaches = slaBreachNotifier.detectAndReport(sla, measurement);

    if (breaches.length > 0) {
      slaBreachNotifier.resolveBreach(breaches[0].breachId);
    }

    const open = slaBreachNotifier.getOpenBreaches();
    expect(Array.isArray(open)).toBe(true);
  });

  it('should generate SLA compliance reports with trends', () => {
    const sla = slaDefinitionManager.define('dp-report', 'Report SLA', { completeness: 99 });
    const m1 = slaMonitor.measure(sla, { completeness: 98 });
    const m2 = slaMonitor.measure(sla, { completeness: 99 });
    const m3 = slaMonitor.measure(sla, { completeness: 99.5 });

    const report = slaReporter.generateReport(sla.slaId, sla, [m1, m2, m3], []);
    expect(report.status).toMatch(/green|yellow|red/);
    expect(report.measurementCount).toBe(3);

    const trend = slaReporter.generateTrendReport([m1, m2, m3]);
    expect(trend.trend).toMatch(/improving|declining|stable/);
  });
});
