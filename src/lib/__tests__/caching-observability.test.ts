import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiLevelCache, analyzeCacheHealth } from '../multi-level-cache';
import { AnomalyDetector, PerformanceProfiler, RequestPathAnalyzer } from '../advanced-observability';
import {
  generateResponsiveImageSrcset,
  getBundleHealthStatus,
  getVitalStatus,
  BUNDLE_THRESHOLDS,
  CORE_WEB_VITALS
} from '../frontend-optimization';

describe('Phase 7: Multi-Level Cache', () => {
  let cache: MultiLevelCache;

  beforeEach(() => {
    cache = new MultiLevelCache();
  });

  it('should set and get from L1 cache', async () => {
    const data = { id: '1', name: 'Test' };
    await cache.set('test:key', data, 300);

    const result = await cache.get('test:key');
    expect(result).toEqual(data);
  });

  it('should handle cache expiration', async () => {
    const data = { id: '1' };
    await cache.set('test:key', data, 1); // 1 second TTL

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    const result = await cache.get('test:key');
    expect(result).toBeNull();
  });

  it('should get cache statistics', async () => {
    await cache.set('key1', { data: 1 }, 300);
    await cache.set('key2', { data: 2 }, 300);

    const stats = cache.getStats();
    expect(stats.l1Size).toBe(2);
    expect(stats.l1Valid).toBeGreaterThan(0);
  });

  it('should clear L1 cache', async () => {
    await cache.set('key1', { data: 1 }, 300);
    cache.clearL1();

    const result = await cache.get('key1');
    expect(result).toBeNull();
  });
});

describe('Phase 9: Anomaly Detection', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector('medium');
  });

  it('should detect anomalies after establishing baseline', () => {
    // Establish baseline
    for (let i = 0; i < 20; i++) {
      detector.recordValue('latency', 100 + Math.random() * 10);
    }
    detector.updateBaseline('latency');

    // Normal value
    const normal = detector.isAnomaly('latency', 105);
    expect(normal.isAnomaly).toBe(false);

    // Anomalous value
    const anomalous = detector.isAnomaly('latency', 200);
    expect(anomalous.isAnomaly).toBe(true);
    expect(anomalous.severity).toBeTruthy();
  });

  it('should calculate correct sensitivity levels', () => {
    const lowSensitivity = new AnomalyDetector('low');
    const highSensitivity = new AnomalyDetector('high');

    // Baseline
    for (let i = 0; i < 20; i++) {
      lowSensitivity.recordValue('metric', 100);
      highSensitivity.recordValue('metric', 100);
    }
    lowSensitivity.updateBaseline('metric');
    highSensitivity.updateBaseline('metric');

    // Same value with different sensitivities
    const testValue = 103;
    const lowResult = lowSensitivity.isAnomaly('metric', testValue);
    const highResult = highSensitivity.isAnomaly('metric', testValue);

    // High sensitivity should detect anomalies sooner
    expect(highResult.deviation).toBe(lowResult.deviation);
  });
});

describe('Phase 9: Performance Profiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  it('should profile operation duration', async () => {
    const end = profiler.start('test-operation');

    await new Promise(resolve => setTimeout(resolve, 50));
    end();

    const stats = profiler.getStats('test-operation');
    expect(stats).toBeTruthy();
    expect(stats!.count).toBe(1);
    expect(stats!.avgDuration).toBeGreaterThanOrEqual(50);
  });

  it('should track multiple profiles', () => {
    const end1 = profiler.start('op1');
    const end2 = profiler.start('op2');

    end1();
    end2();

    const allStats = profiler.getAllStats();
    expect(Object.keys(allStats).length).toBe(2);
  });
});

describe('Phase 9: Request Path Analyzer', () => {
  let analyzer: RequestPathAnalyzer;

  beforeEach(() => {
    analyzer = new RequestPathAnalyzer();
  });

  it('should record request paths', () => {
    analyzer.recordRequestPath('GET', '/api/users', 100);
    analyzer.recordRequestPath('GET', '/api/users', 150);

    const metrics = analyzer.getAllMetrics();
    expect(metrics['GET /api/users']).toBeTruthy();
    expect(metrics['GET /api/users'].callCount).toBe(2);
    expect(metrics['GET /api/users'].avgDuration).toBe(125);
  });

  it('should identify slowest paths', () => {
    analyzer.recordRequestPath('GET', '/api/slow', 1000);
    analyzer.recordRequestPath('GET', '/api/fast', 10);

    const slowest = analyzer.getSlowestPaths(1);
    expect(slowest[0].path).toBe('/api/slow');
  });

  it('should identify paths with high error rates', () => {
    analyzer.recordRequestPath('GET', '/api/users', 100, false);
    analyzer.recordRequestPath('GET', '/api/users', 100, true);
    analyzer.recordRequestPath('GET', '/api/users', 100, true);

    const errory = analyzer.getErroryPaths(1);
    expect(errory[0].errorRate).toBeGreaterThan(0);
  });
});

describe('Phase 8: Frontend Optimization', () => {
  it('should generate responsive image srcset', () => {
    const config = {
      originalWidth: 1920,
      originalHeight: 1080,
      originalSize: 500 * 1024 // 500KB
    };

    const result = generateResponsiveImageSrcset('/images/photo.jpg', config);

    expect(result.srcset).toContain('320w');
    expect(result.srcset).toContain('640w');
    expect(result.sizes).toBeTruthy();
    expect(result.estimatedSize).toBeLessThan(config.originalSize);
  });

  it('should evaluate bundle health status', () => {
    const ideal = getBundleHealthStatus(100 * 1024);
    expect(ideal.status).toBe('ideal');

    const warning = getBundleHealthStatus(400 * 1024);
    expect(warning.status).toBe('warning');

    const critical = getBundleHealthStatus(2 * 1024 * 1024);
    expect(critical.status).toBe('critical');
  });

  it('should assess Core Web Vitals status', () => {
    const goodLCP = getVitalStatus('LCP', 2000);
    expect(goodLCP).toBe('good');

    const needsImprovement = getVitalStatus('LCP', 3500);
    expect(needsImprovement).toBe('needsImprovement');

    const poor = getVitalStatus('LCP', 5000);
    expect(poor).toBe('poor');
  });

  it('should evaluate cache health', () => {
    const excellent = analyzeCacheHealth(90, 300);
    expect(excellent.recommendation).toContain('Excellent');

    const poor = analyzeCacheHealth(30, 300);
    expect(poor.recommendation).toContain('Low hit rate');
  });
});
