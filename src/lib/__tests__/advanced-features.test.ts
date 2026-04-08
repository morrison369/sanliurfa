import { describe, it, expect, beforeEach } from 'vitest';
import { QueryOptimizer, queryRewriter } from '../query-optimizer';
import { calculateDistance, findNearestEdge, RegionHealthMonitor, EDGE_CACHE_POLICIES, matchCachePolicy } from '../cdn-distribution';
import { ReportBuilder, DashboardManager, KPITracker } from '../analytics-reporting';
import { createInvoiceFromCycle, DunningManager, RefundManager, SubscriptionAnalytics } from '../payment-billing';
import { AuditLogger, GDPRManager, DataRetentionManager, EncryptionManager } from '../security-compliance';
import { RecommendationEngine, ChurnPredictor, UserSegmenter, FeatureImportance } from '../ml-integration';

// ==================== Phase 10 Tests ====================

describe('Phase 10: Query Optimization', () => {
  let optimizer: QueryOptimizer;

  beforeEach(() => {
    optimizer = new QueryOptimizer();
  });

  it('should record and analyze queries', () => {
    optimizer.recordQuery('SELECT * FROM users WHERE id = $1', 100, 1);
    optimizer.recordQuery('SELECT * FROM users WHERE id = $1', 120, 1);

    const slowest = optimizer.getSlowestQueries(1);
    expect(slowest.length).toBeGreaterThan(0);
    expect(slowest[0].avgTime).toBeLessThanOrEqual(120);
  });

  it('should suggest optimizations for slow queries', () => {
    // Record slow query multiple times
    for (let i = 0; i < 5; i++) {
      optimizer.recordQuery('SELECT * FROM users WHERE status = $1 GROUP BY country', 250, 1000);
    }

    const opportunities = optimizer.getOptimizationOpportunities(30);
    expect(opportunities.length).toBeGreaterThan(0);
  });

  it('should detect N+1 queries', () => {
    const queries = [
      'SELECT * FROM users WHERE id = 1',
      'SELECT * FROM users WHERE id = 2',
      'SELECT * FROM users WHERE id = 3',
      'SELECT * FROM users WHERE id = 4',
      'SELECT * FROM users WHERE id = 5',
      'SELECT * FROM users WHERE id = 6'
    ];

    const nPlusOne = queryRewriter.detectNPlusOne(queries);
    expect(nPlusOne).toBeTruthy();
  });

  it('should suggest SELECT * optimization', () => {
    const query = 'SELECT * FROM users WHERE active = true';
    const suggestion = queryRewriter.detectSelectStar(query);
    expect(suggestion).toBeTruthy();
  });
});

// ==================== Phase 11 Tests ====================

describe('Phase 11: Global Distribution', () => {
  it('should calculate geographic distance', () => {
    // Distance between New York and London
    const distance = calculateDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(distance).toBeGreaterThan(5000); // ~5570 km
    expect(distance).toBeLessThan(6000);
  });

  it('should find nearest CDN edge', () => {
    const turkyLocation = {
      country: 'TR',
      region: 'Şanlıurfa',
      city: 'Şanlıurfa',
      latitude: 37.1592,
      longitude: 38.7969,
      timezone: 'Europe/Istanbul'
    };

    const nearest = findNearestEdge(turkyLocation);
    expect(nearest.location.country).toBe('TR');
  });

  it('should monitor region health', () => {
    const monitor = new RegionHealthMonitor();

    monitor.recordHealthCheck('us-east', 50, true);
    monitor.recordHealthCheck('eu-west', 30, true);

    const healthy = monitor.getHealthyRegions();
    expect(healthy.length).toBeGreaterThan(0);
  });

  it('should find fastest healthy region', () => {
    const monitor = new RegionHealthMonitor();

    monitor.recordHealthCheck('us-east', 100, true);
    monitor.recordHealthCheck('eu-west', 30, true);
    monitor.recordHealthCheck('asia-sg', 80, true);

    const fastest = monitor.getFastestRegion();
    expect(fastest).toBeTruthy();
  });

  it('should apply cache policies', () => {
    const imagePolicy = matchCachePolicy('/images/photo.jpg');
    expect(imagePolicy.sMaxAge).toBe(86400 * 365);

    const apiPolicy = matchCachePolicy('/api/places');
    expect(apiPolicy.sMaxAge).toBe(3600);

    const authPolicy = matchCachePolicy('/api/auth/login');
    expect(authPolicy.sMaxAge).toBe(0);
  });
});

// ==================== Phase 12 Tests ====================

describe('Phase 12: Analytics & Reporting', () => {
  let reportBuilder: ReportBuilder;
  let dashboard: DashboardManager;
  let kpiTracker: KPITracker;

  beforeEach(() => {
    reportBuilder = new ReportBuilder();
    dashboard = new DashboardManager();
    kpiTracker = new KPITracker();
  });

  it('should define and build reports', () => {
    reportBuilder.defineReport('revenue', {
      name: 'Revenue Analysis',
      cube: 'revenue-analysis',
      dimensions: ['month', 'tier'],
      measures: ['Revenue', 'Transaction Count'],
      limit: 100
    });

    const report = reportBuilder.getReport('revenue');
    expect(report).toBeTruthy();
    expect(report?.dimensions).toContain('month');
  });

  it('should build SQL from report config', () => {
    const config = {
      name: 'Test',
      cube: 'revenue-analysis',
      dimensions: ['month'],
      measures: ['Revenue'],
      limit: 50
    };

    const sql = reportBuilder.buildReportSQL(config);
    expect(sql).toContain('SELECT');
    expect(sql).toContain('FROM');
  });

  it('should create dashboards with widgets', () => {
    const dash = dashboard.createDashboard('exec', 'Executive Dashboard', 'executive');

    dashboard.addWidget('exec', {
      id: 'widget1',
      type: 'metric',
      report: 'revenue',
      title: 'MRR'
    });

    const retrieved = dashboard.getDashboard('exec');
    expect(retrieved?.widgets).toHaveLength(1);
  });

  it('should track KPIs', () => {
    kpiTracker.recordKPI('mrr', 50000);
    kpiTracker.recordKPI('mrr', 55000);

    const history = kpiTracker.getHistory('mrr', 1);
    expect(history.length).toBeGreaterThan(0);
  });

  it('should assess KPI status', () => {
    kpiTracker.recordKPI('churn', 3);
    const status = kpiTracker.getStatus('churn');
    expect(['healthy', 'warning', 'critical']).toContain(status);
  });
});

// ==================== Phase 13 Tests ====================

describe('Phase 13: Payment & Billing', () => {
  let dunning: DunningManager;
  let refunds: RefundManager;

  beforeEach(() => {
    dunning = new DunningManager();
    refunds = new RefundManager();
  });

  it('should manage dunning progression', () => {
    const rule1 = dunning.recordFailure('sub123');
    expect(rule1?.retryAfterDays).toBe(4);

    const rule2 = dunning.recordFailure('sub123');
    expect(rule2?.retryAfterDays).toBe(9);

    const shouldCancel = dunning.shouldCancel('sub123');
    expect(typeof shouldCancel).toBe('boolean');
  });

  it('should handle refunds', () => {
    const refund = refunds.createRefund('txn123', 'sub123', 100, 'user_request');

    expect(refund.status).toBe('approved'); // Auto-approve < $500
    expect(refund.amount).toBe(100);
  });

  it('should calculate subscription metrics', () => {
    const ltv = SubscriptionAnalytics.calculateLTV(100, 24);
    expect(ltv).toBe(2400);

    const mrr = SubscriptionAnalytics.calculateMRR([
      { amount: 100, billingCycle: 30 },
      { amount: 200, billingCycle: 30 }
    ]);
    expect(mrr).toBeGreaterThan(0);
  });
});

// ==================== Phase 14 Tests ====================

describe('Phase 14: Security & Compliance', () => {
  let audit: AuditLogger;
  let gdpr: GDPRManager;
  let retention: DataRetentionManager;

  beforeEach(() => {
    audit = new AuditLogger();
    gdpr = new GDPRManager();
    retention = new DataRetentionManager();
  });

  it('should log audit events', () => {
    const log = audit.logAction('user123', 'login', 'users', 'user123', {
      ipAddress: '192.168.1.1'
    });

    expect(log.action).toBe('login');
    expect(log.status).toBe('success');
  });

  it('should query audit logs', () => {
    audit.logAction('user1', 'update', 'profile', 'user1');
    audit.logAction('user2', 'delete', 'review', 'review1');

    const results = audit.queryLogs({ action: 'update' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should manage GDPR consent', () => {
    gdpr.recordConsent('user1', 'marketing', true);

    const hasConsent = gdpr.hasConsent('user1', 'marketing');
    expect(hasConsent).toBe(true);
  });

  it('should enforce data retention', () => {
    const now = Date.now();
    const old = now - 40 * 24 * 60 * 60 * 1000; // 40 days ago

    const shouldDelete = retention.shouldDelete('user_activity_logs', old);
    expect(shouldDelete).toBe(true);
  });

  it('should encrypt and decrypt data', () => {
    const secret = 'my-secret-key';
    const data = 'sensitive-data';

    const encrypted = EncryptionManager.encrypt(data, secret);
    const decrypted = EncryptionManager.decrypt(encrypted, secret);

    expect(decrypted).toBe(data);
  });
});

// ==================== Phase 15 Tests ====================

describe('Phase 15: Machine Learning Integration', () => {
  let recommendations: RecommendationEngine;
  let churn: ChurnPredictor;
  let segmenter: UserSegmenter;

  beforeEach(() => {
    recommendations = new RecommendationEngine();
    churn = new ChurnPredictor();
    segmenter = new UserSegmenter();
  });

  it('should record user interactions', () => {
    recommendations.recordInteraction('user1', 'place1', 'view');
    recommendations.recordInteraction('user1', 'place2', 'like');
    recommendations.recordInteraction('user1', 'place3', 'purchase');

    // Should not throw
    expect(true).toBe(true);
  });

  it('should predict churn risk', () => {
    const prediction = churn.predictChurn({
      lastActiveDate: Date.now() - 45 * 24 * 60 * 60 * 1000, // 45 days ago
      accountAgeMonths: 2,
      monthlyInteractions: 2,
      totalTransactions: 0,
      avgSessionDuration: 200
    });

    expect(prediction.churnRisk).toBeGreaterThan(50);
    expect(prediction.riskFactors.length).toBeGreaterThan(0);
  });

  it('should segment users', () => {
    segmenter.defineSegment('vip', 'VIP Users', 'High-value customers', {
      totalTransactions: { min: 10 },
      avgSessionDuration: { min: 600 }
    });

    const segments = segmenter.segmentUser('user1', {
      totalTransactions: 15,
      avgSessionDuration: 800
    });

    expect(segments).toContain('vip');
  });

  it('should track feature importance', () => {
    const importance = new FeatureImportance();

    importance.recordInteraction('recommendation_carousel');
    importance.recordInteraction('recommendation_carousel');
    importance.recordInteraction('recommendation_carousel');
    importance.recordConversion('recommendation_carousel');

    const metrics = importance.getFeatureMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });
});
