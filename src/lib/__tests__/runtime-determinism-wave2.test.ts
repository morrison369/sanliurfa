import { describe, expect, it } from 'vitest';
import { RequestPathAnalyzer, TraceContext } from '../advanced-observability';
import { FlakinessDetector, TestHealthMonitor, TestPrioritizer } from '../testing-analytics';
import { RankingEngine, SemanticSearch } from '../semantic-intelligence';
import { ChaosScenario, FailureInjector, RecoveryAnalyzer, ResilienceValidator } from '../chaos-engineering';
import { ServiceDiscovery, ServiceMesh } from '../service-mesh';
import { AttackSurfaceAnalyzer, ThreatModeler } from '../threat-modeling';

describe('Runtime determinism wave 2', () => {
  it('keeps observability trace and request path behavior deterministic', () => {
    const trace = new TraceContext('trace-seed', 'root-span');
    const first = trace.createChildSpan('db.query');
    const second = trace.createChildSpan('db.query');
    const analyzer = new RequestPathAnalyzer();

    analyzer.recordRequestPath('/api/orders', 'GET', 120, false, 'cache');
    analyzer.recordRequestPath('/api/orders', 'GET', 480, true, 'db');

    const metrics = analyzer.getAllMetrics()['GET /api/orders'];

    expect(first.traceId).toBe('trace-seed');
    expect(first.spanId).toBe('root-span-1');
    expect(second.spanId).toBe('root-span-2');
    expect(metrics.bottleneck).toBe('db');
    expect(metrics.errorRate).toBeGreaterThan(0);
  });

  it('keeps testing analytics deterministic for the same inputs', () => {
    const flakiness = new FlakinessDetector();
    const prioritizer = new TestPrioritizer();
    const health = new TestHealthMonitor();

    expect(flakiness.detectFlakyTests()).toEqual(flakiness.detectFlakyTests());
    expect(prioritizer.rankByRisk(['auth.test.ts', 'api.test.ts'])).toEqual(
      prioritizer.rankByRisk(['auth.test.ts', 'api.test.ts'])
    );
    expect(prioritizer.getOptimalTestOrder(12000)).toEqual(prioritizer.getOptimalTestOrder(12000));
    expect(health.getHealth()).toEqual(health.getHealth());
    expect(health.getHealthTrend(14)).toEqual(health.getHealthTrend(14));
  });

  it('keeps semantic ranking deterministic', () => {
    const search = new SemanticSearch();
    const ranking = new RankingEngine();
    const first = search.semanticSearch('sanliurfa food', 4);
    const second = search.semanticSearch('sanliurfa food', 4);
    const rankedA = ranking.rankResults('sanliurfa food', first.results, 'personalized');
    const rankedB = ranking.rankResults('sanliurfa food', first.results, 'personalized');

    expect(first).toEqual(second);
    expect(rankedA).toEqual(rankedB);
    expect(ranking.learningToRank([{ clicks: 10, dwell: 4 }, { clicks: 6, dwell: 8 }])).toEqual(
      ranking.learningToRank([{ clicks: 10, dwell: 4 }, { clicks: 6, dwell: 8 }])
    );
  });

  it('keeps chaos engineering outcomes deterministic for the same failure set', () => {
    const injector = new FailureInjector();
    const validator = new ResilienceValidator();
    const recovery = new RecoveryAnalyzer();
    const scenarios = new ChaosScenario();

    injector.injectServiceUnavailability('payments', 6000);
    injector.injectNetworkLatency(1200, ['payments']);

    const recoveryA = validator.validateRecovery();
    const recoveryB = validator.validateRecovery();

    expect(recoveryA).toEqual(recoveryB);
    expect(validator.validateCircuitBreaker('payments')).toEqual(validator.validateCircuitBreaker('payments'));
    expect(validator.validateRetryPolicy('payments')).toEqual(validator.validateRetryPolicy('payments'));

    recovery.recordRecovery('payments', 150, 2200, 0.4);
    recovery.recordRecovery('orders', 120, 1800, 0.2);
    expect(recovery.analyzeRecoveryTrend()).toEqual(recovery.analyzeRecoveryTrend());

    const scenarioA = scenarios.create({ name: 'payments-failure', duration: 3000, targets: ['payments'] });
    const scenarioB = scenarios.create({ name: 'payments-failure', duration: 3000, targets: ['payments'] });
    expect(scenarioA.id).not.toBe(scenarioB.id);
  });

  it('keeps service mesh discovery and traffic metrics deterministic', () => {
    const mesh = new ServiceMesh();
    const discovery = new ServiceDiscovery();

    const metricsA = mesh.getTrafficMetrics('orders', 300);
    const metricsB = mesh.getTrafficMetrics('orders', 300);
    discovery.registerService({ name: 'orders', namespace: 'core', port: 8080 });

    expect(metricsA).toEqual(metricsB);
    expect(discovery.discoverServices('core')).toEqual(discovery.discoverServices('core'));
    expect(discovery.discoverServices('core')[0]?.replicas).toBeGreaterThan(0);
  });

  it('keeps threat modeling deterministic', () => {
    const modelerA = new ThreatModeler();
    const modelerB = new ThreatModeler();
    const surfaceAnalyzer = new AttackSurfaceAnalyzer();
    const threatsA = modelerA.identifyThreats('billing-api').map(({ name, category, probability, impact, riskScore }) => ({
      name,
      category,
      probability,
      impact,
      riskScore
    }));
    const threatsB = modelerB.identifyThreats('billing-api').map(({ name, category, probability, impact, riskScore }) => ({
      name,
      category,
      probability,
      impact,
      riskScore
    }));
    const surface = surfaceAnalyzer.mapAttackSurface('billing-api');

    expect(threatsA).toEqual(threatsB);
    expect(surfaceAnalyzer.getEntryPointRisks(surface)).toEqual(surfaceAnalyzer.getEntryPointRisks(surface));
  });
});
