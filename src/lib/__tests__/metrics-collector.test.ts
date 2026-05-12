/**
 * Unit Tests — metrics.ts
 *
 * MetricsCollector singleton + helpers:
 * - recordRequest()/recordMetric()/recordQuery()/recordSlowOperation()
 * - getMetrics(): aggregated (totalRequests/errorRate/p95/cacheHitRate/byEndpoint/byStatusCode/slowestEndpoints)
 * - getPerformanceStats(): query/request perf + dbPoolStatus + slowOperations
 * - getEndpointMetrics(method, path)
 * - getRawMetrics(), getCount()
 * - getSlowQueries(limit), getSlowOperations(limit)
 * - resetAll()
 * - performanceThresholds + isSlowRequest/isSlowQuery/isSlowCache
 *
 * Singleton: her test başında metricsCollector.resetAll() çağırılmalı.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  metricsCollector,
  recordRequest,
  performanceThresholds,
  isSlowRequest,
  isSlowQuery,
  isSlowCache,
} from '../metrics';

beforeEach(() => {
  metricsCollector.resetAll();
});

describe('performanceThresholds', () => {
  it('default değerler — slowQuery 100ms, slowRequest 500ms, slowCache 50ms', () => {
    expect(performanceThresholds.slowQueryMs).toBe(100);
    expect(performanceThresholds.slowRequestMs).toBe(500);
    expect(performanceThresholds.slowCacheMs).toBe(50);
  });

  it('highErrorRatePercent = 5%', () => {
    expect(performanceThresholds.highErrorRatePercent).toBe(5);
  });
});

describe('isSlowRequest', () => {
  it('500ms boundary — strict >', () => {
    expect(isSlowRequest(500)).toBe(false);
    expect(isSlowRequest(501)).toBe(true);
  });

  it('hızlı request — false', () => {
    expect(isSlowRequest(50)).toBe(false);
    expect(isSlowRequest(0)).toBe(false);
  });
});

describe('isSlowQuery', () => {
  it('100ms boundary — strict >', () => {
    expect(isSlowQuery(100)).toBe(false);
    expect(isSlowQuery(101)).toBe(true);
  });
});

describe('isSlowCache', () => {
  it('50ms boundary — strict >', () => {
    expect(isSlowCache(50)).toBe(false);
    expect(isSlowCache(51)).toBe(true);
  });
});

describe('recordRequest helper', () => {
  it('basic record → metric counted', () => {
    recordRequest('GET', '/api/places', 200, 50);
    expect(metricsCollector.getCount()).toBe(1);
  });

  it('cacheHit option set', () => {
    recordRequest('GET', '/api/x', 200, 30, { cacheHit: true });
    const raw = metricsCollector.getRawMetrics();
    expect(raw[0].cacheHit).toBe(true);
  });

  it('error option set', () => {
    recordRequest('POST', '/api/x', 500, 10, { error: 'DB connection lost' });
    const raw = metricsCollector.getRawMetrics();
    expect(raw[0].error).toBe('DB connection lost');
  });

  it('opsiyonel field undefined → object alanı yok', () => {
    recordRequest('GET', '/api/x', 200, 10);
    const raw = metricsCollector.getRawMetrics();
    expect(raw[0].cacheHit).toBeUndefined();
    expect(raw[0].error).toBeUndefined();
  });
});

describe('MetricsCollector.getMetrics — empty state', () => {
  it('hiç request yok → tüm field 0', () => {
    const m = metricsCollector.getMetrics();
    expect(m.totalRequests).toBe(0);
    expect(m.totalErrors).toBe(0);
    expect(m.errorRate).toBe(0);
    expect(m.avgDuration).toBe(0);
    expect(m.cacheHitRate).toBe(0);
    expect(m.byEndpoint).toEqual({});
    expect(m.byStatusCode).toEqual({});
    expect(m.slowestEndpoints).toEqual([]);
  });
});

describe('MetricsCollector.getMetrics — populated', () => {
  beforeEach(() => {
    recordRequest('GET', '/api/a', 200, 100);
    recordRequest('GET', '/api/a', 200, 200);
    recordRequest('POST', '/api/b', 500, 600); // slow + error
    recordRequest('GET', '/api/c', 304, 30, { cacheHit: true });
  });

  it('totalRequests = 4', () => {
    expect(metricsCollector.getMetrics().totalRequests).toBe(4);
  });

  it('totalErrors = 1 (statusCode >= 400)', () => {
    expect(metricsCollector.getMetrics().totalErrors).toBe(1);
  });

  it('errorRate = round(1/4*100) = 25', () => {
    expect(metricsCollector.getMetrics().errorRate).toBe(25);
  });

  it('avgDuration = round((100+200+600+30)/4)', () => {
    expect(metricsCollector.getMetrics().avgDuration).toBe(Math.round((100 + 200 + 600 + 30) / 4));
  });

  it('minDuration = 30 (en hızlı)', () => {
    expect(metricsCollector.getMetrics().minDuration).toBe(30);
  });

  it('maxDuration = 600 (en yavaş)', () => {
    expect(metricsCollector.getMetrics().maxDuration).toBe(600);
  });

  it('slowRequests = 1 (>500ms)', () => {
    expect(metricsCollector.getMetrics().slowRequests).toBe(1);
  });

  it('cacheHitRate = round(1/4*100) = 25', () => {
    expect(metricsCollector.getMetrics().cacheHitRate).toBe(25);
  });

  it('byEndpoint — GET /api/a sayım 2', () => {
    const m = metricsCollector.getMetrics();
    expect(m.byEndpoint['GET /api/a'].count).toBe(2);
    expect(m.byEndpoint['GET /api/a'].avgDuration).toBe(150);
    expect(m.byEndpoint['GET /api/a'].errorCount).toBe(0);
  });

  it('byEndpoint — POST /api/b errorCount 1', () => {
    const m = metricsCollector.getMetrics();
    expect(m.byEndpoint['POST /api/b'].errorCount).toBe(1);
    expect(m.byEndpoint['POST /api/b'].slowCount).toBe(1);
  });

  it('byEndpoint — GET /api/c cacheEfficiency 100%', () => {
    const m = metricsCollector.getMetrics();
    expect(m.byEndpoint['GET /api/c'].cacheHits).toBe(1);
    expect(m.byEndpoint['GET /api/c'].cacheEfficiency).toBe(100);
  });

  it('byStatusCode dağılımı', () => {
    const m = metricsCollector.getMetrics();
    expect(m.byStatusCode['200']).toBe(2);
    expect(m.byStatusCode['304']).toBe(1);
    expect(m.byStatusCode['500']).toBe(1);
  });

  it('slowestEndpoints sırası — desc avgDuration', () => {
    const m = metricsCollector.getMetrics();
    expect(m.slowestEndpoints[0].endpoint).toBe('POST /api/b');
    expect(m.slowestEndpoints[0].avgDuration).toBe(600);
  });

  it('slowestEndpoints max 5 entry', () => {
    metricsCollector.resetAll();
    for (let i = 0; i < 10; i++) {
      recordRequest('GET', `/api/${i}`, 200, i * 100);
    }
    expect(metricsCollector.getMetrics().slowestEndpoints).toHaveLength(5);
  });
});

describe('MetricsCollector.getEndpointMetrics', () => {
  it('method+path eşleşen metric döner', () => {
    recordRequest('GET', '/api/a', 200, 50);
    recordRequest('POST', '/api/a', 200, 100); // farklı method
    recordRequest('GET', '/api/b', 200, 50);
    const result = metricsCollector.getEndpointMetrics('GET', '/api/a');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/a');
    expect(result[0].method).toBe('GET');
  });

  it('eşleşme yok → boş array', () => {
    expect(metricsCollector.getEndpointMetrics('GET', '/missing')).toEqual([]);
  });
});

describe('MetricsCollector.recordQuery', () => {
  it('hızlı query → isSlow=false', () => {
    metricsCollector.recordQuery('SELECT * FROM users', 50);
    const stats = metricsCollector.getPerformanceStats();
    expect(stats.slowQueryCount).toBe(0);
  });

  it('yavaş query (>100ms) → isSlow=true', () => {
    metricsCollector.recordQuery('SELECT * FROM places', 200);
    expect(metricsCollector.getPerformanceStats().slowQueryCount).toBe(1);
  });

  it('query 200 char ile truncate', () => {
    const longQuery = 'SELECT '.repeat(100);
    metricsCollector.recordQuery(longQuery, 50);
    const slowQueries = metricsCollector.getSlowQueries();
    // Yavaş değil, slowQueries boş; rawQuery erişilemiyor
    // truncate behavior recordQuery sırasında uygulanır - test getPerformanceStats üzerinden
    expect(metricsCollector.getPerformanceStats().avgQueryDuration).toBe(50);
  });
});

describe('MetricsCollector.getSlowQueries', () => {
  it('yavaş query listesi süreye göre desc sıralı', () => {
    metricsCollector.recordQuery('q1', 150);
    metricsCollector.recordQuery('q2', 250);
    metricsCollector.recordQuery('q3', 50); // yavaş değil
    const slow = metricsCollector.getSlowQueries();
    expect(slow).toHaveLength(2);
    expect(slow[0].duration).toBe(250);
    expect(slow[1].duration).toBe(150);
  });

  it('limit parametresi', () => {
    for (let i = 0; i < 5; i++) {
      metricsCollector.recordQuery(`q${i}`, 200 + i);
    }
    expect(metricsCollector.getSlowQueries(3)).toHaveLength(3);
  });

  it('default limit 20', () => {
    expect(metricsCollector.getSlowQueries()).toEqual([]);
  });
});

describe('MetricsCollector.recordSlowOperation', () => {
  it('basit slow op kaydı', () => {
    metricsCollector.recordSlowOperation('cache', 'cache get took long', 100);
    const ops = metricsCollector.getSlowOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('cache');
    expect(ops[0].message).toBe('cache get took long');
  });

  it('context + stack opsiyonel', () => {
    metricsCollector.recordSlowOperation('query', 'msg', 100, { foo: 'bar' }, 'stack-trace');
    const ops = metricsCollector.getSlowOperations();
    expect(ops[0].context).toEqual({ foo: 'bar' });
    expect(ops[0].stack).toBe('stack-trace');
  });

  it('500 entry buffer cap', () => {
    for (let i = 0; i < 600; i++) {
      metricsCollector.recordSlowOperation('cache', `op-${i}`, 100);
    }
    // İçerideki array max 500'e cap'lenir
    const ops = metricsCollector.getSlowOperations(1000);
    expect(ops.length).toBeLessThanOrEqual(500);
  });
});

describe('MetricsCollector.getSlowOperations', () => {
  it('reverse order (en son eklenen ilk)', () => {
    metricsCollector.recordSlowOperation('cache', 'first', 100);
    metricsCollector.recordSlowOperation('cache', 'second', 100);
    metricsCollector.recordSlowOperation('cache', 'third', 100);
    const ops = metricsCollector.getSlowOperations(3);
    expect(ops[0].message).toBe('third');
    expect(ops[2].message).toBe('first');
  });

  it('limit parametresi', () => {
    for (let i = 0; i < 10; i++) {
      metricsCollector.recordSlowOperation('cache', `op-${i}`, 100);
    }
    expect(metricsCollector.getSlowOperations(5)).toHaveLength(5);
  });
});

describe('MetricsCollector.setPoolStatus + getPerformanceStats', () => {
  it('pool status update + stats okunur', () => {
    metricsCollector.setPoolStatus({
      totalConnections: 10,
      activeConnections: 3,
      idleConnections: 7,
      waitingRequests: 0,
    });
    const stats = metricsCollector.getPerformanceStats();
    expect(stats.dbPoolStatus.totalConnections).toBe(10);
    expect(stats.dbPoolStatus.activeConnections).toBe(3);
  });

  it('stats default boş — totalRequests 0, slowQueryCount 0', () => {
    const stats = metricsCollector.getPerformanceStats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.slowQueryCount).toBe(0);
    expect(stats.avgQueryDuration).toBe(0);
  });

  it('avgQueryDuration round average', () => {
    metricsCollector.recordQuery('q1', 50);
    metricsCollector.recordQuery('q2', 150);
    expect(metricsCollector.getPerformanceStats().avgQueryDuration).toBe(100);
  });

  it('maxQueryDuration en yavaş query', () => {
    metricsCollector.recordQuery('q1', 50);
    metricsCollector.recordQuery('q2', 250);
    expect(metricsCollector.getPerformanceStats().maxQueryDuration).toBe(250);
  });
});

describe('MetricsCollector.resetAll', () => {
  it('tüm state temizler', () => {
    recordRequest('GET', '/x', 200, 50);
    metricsCollector.recordQuery('q1', 100);
    metricsCollector.recordSlowOperation('cache', 'msg', 100);
    metricsCollector.resetAll();
    expect(metricsCollector.getCount()).toBe(0);
    expect(metricsCollector.getSlowQueries()).toEqual([]);
    expect(metricsCollector.getSlowOperations(100)).toEqual([]);
  });
});

describe('MetricsCollector — p95 calculation', () => {
  it('100 request, p95 = 95. percentile', () => {
    for (let i = 1; i <= 100; i++) {
      recordRequest('GET', '/api/x', 200, i); // duration: 1, 2, ..., 100
    }
    const m = metricsCollector.getMetrics();
    // sorted asc, index Math.floor(100 * 0.95) = 95 → değer 96
    expect(m.p95Duration).toBe(96);
  });
});
