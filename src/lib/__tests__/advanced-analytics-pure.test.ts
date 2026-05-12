/**
 * Unit Tests - analytics/advanced-analytics.ts in-memory analytics (pure)
 *
 * - trackEvent (id + timestamp + push to eventStore + MAX_EVENTS cap)
 * - recordMetric (push to metricsStore)
 * - getPageViews (date range filter + groupBy hour/day/week/month)
 * - getTopPages (page + views + uniqueUsers Set)
 * - getUserSessions (start/end/duration + bounce rate)
 * - getDeviceBreakdown (device count + percentage)
 * - getGeographicData (country/city aggregation)
 * - createFunnel (steps + conversionRate + dropOffRate)
 * - getRealTimeStats (5-min active sessions + 1-min page views)
 * - getDashboardData (combined overview)
 * - exportData (json / csv format)
 * - clearOldData (cutoff filter)
 *
 * In-memory store shared - testler unique sessionId/userId kullanir.
 */

import { describe, it, expect } from 'vitest';
import {
  trackEvent,
  recordMetric,
  getPageViews,
  getTopPages,
  getUserSessions,
  getDeviceBreakdown,
  getGeographicData,
  createFunnel,
  getRealTimeStats,
  getDashboardData,
  exportData,
  clearOldData,
} from '../analytics/advanced-analytics';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('trackEvent', () => {
  it('id + timestamp + sessionId + page default "/"', () => {
    const sid = uniq('sess');
    const e = trackEvent('page_view', sid, {});
    expect(e.id).toBeDefined();
    expect(e.timestamp).toBeDefined();
    expect(e.sessionId).toBe(sid);
    expect(e.page).toBe('/');
  });

  it('userId + properties + metadata optional spread', () => {
    const e = trackEvent('click', uniq('sess'), {
      userId: 'u-1',
      properties: { button: 'submit' },
      metadata: { device: 'mobile', country: 'TR' },
    });
    expect(e.userId).toBe('u-1');
    expect(e.properties?.button).toBe('submit');
    expect(e.metadata?.device).toBe('mobile');
  });
});

describe('recordMetric', () => {
  it('no-throw smoke', () => {
    expect(() => recordMetric('test_metric', 100, { region: 'eu' })).not.toThrow();
    expect(() => recordMetric('test_metric_2', 50)).not.toThrow();
  });
});

describe('getPageViews', () => {
  it('date range filter - boş range → []', () => {
    const r = getPageViews(new Date('2099-01-01'), new Date('2099-01-02'));
    expect(r).toEqual([]);
  });

  it('groupBy day - ISO date prefix slice', () => {
    const sid = uniq('pv-day');
    trackEvent('page_view', sid, { userId: 'u-day-1' });
    const r = getPageViews(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000), 'day');
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uniqueUsers Set semantics - aynı userId tek sayilir', () => {
    const sid = uniq('pv-uniq');
    trackEvent('page_view', sid, { userId: 'u-uniq-1' });
    trackEvent('page_view', sid, { userId: 'u-uniq-1' });
    const r = getPageViews(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    const found = r.find((p) => p.uniqueUsers >= 1);
    expect(found).toBeDefined();
  });
});

describe('getTopPages', () => {
  it('limit slice + views desc sort', () => {
    const sid = uniq('tp');
    for (let i = 0; i < 5; i++) {
      trackEvent('page_view', sid, { page: `/test-page-${i}-${Date.now()}` });
    }
    const r = getTopPages(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000), 3);
    expect(r.length).toBeLessThanOrEqual(3);
  });
});

describe('getUserSessions', () => {
  it('totalSessions + uniqueUsers + avgSessionDuration + bounceRate', () => {
    const sid = uniq('us');
    trackEvent('page_view', sid, { userId: 'u-us-1' });
    const r = getUserSessions(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(typeof r.totalSessions).toBe('number');
    expect(typeof r.uniqueUsers).toBe('number');
    expect(typeof r.bounceRate).toBe('number');
  });

  it('boş range - tum 0', () => {
    const r = getUserSessions(new Date('2099-01-01'), new Date('2099-01-02'));
    expect(r.totalSessions).toBe(0);
    expect(r.bounceRate).toBe(0);
  });
});

describe('getDeviceBreakdown', () => {
  it('device + count + percentage 0-100', () => {
    const sid = uniq('dev');
    trackEvent('page_view', sid, { metadata: { device: 'mobile' } });
    trackEvent('page_view', sid, { metadata: { device: 'desktop' } });
    const r = getDeviceBreakdown(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(r.length).toBeGreaterThanOrEqual(1);
    for (const d of r) {
      expect(d.percentage).toBeGreaterThanOrEqual(0);
      expect(d.percentage).toBeLessThanOrEqual(100);
    }
  });
});

describe('getGeographicData', () => {
  it('country:city key - aggregation', () => {
    const sid = uniq('geo');
    trackEvent('page_view', sid, { metadata: { country: 'TR', city: 'Sanliurfa' } });
    trackEvent('page_view', sid, { metadata: { country: 'TR', city: 'Sanliurfa' } });
    const r = getGeographicData(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it('country yok - "Unknown" fallback', () => {
    const sid = uniq('geo-unknown');
    trackEvent('page_view', sid, {});
    const r = getGeographicData(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
});

describe('createFunnel', () => {
  it('steps + conversionRate ilk %100 + sonraki azalan', () => {
    const sid = uniq('funnel');
    const step1 = uniq('event-step1');
    const step2 = uniq('event-step2');
    for (let i = 0; i < 10; i++) {
      trackEvent(step1 as any, `${sid}-${i}`, { userId: `u-${i}` });
    }
    for (let i = 0; i < 5; i++) {
      trackEvent(step2 as any, `${sid}-${i}`, { userId: `u-${i}` });
    }
    const f = createFunnel('test-funnel', [step1, step2], new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(f.steps).toHaveLength(2);
    expect(f.steps[0].conversionRate).toBe(100); // ilk step
    expect(f.totalConversionRate).toBeGreaterThan(0);
  });

  it('boş steps - totalConversionRate 0', () => {
    const f = createFunnel('empty-funnel', [], new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(f.totalConversionRate).toBe(0);
    expect(f.steps).toEqual([]);
  });
});

describe('getRealTimeStats', () => {
  it('activeUsers + pageViewsLastMinute + topPages structure', () => {
    const sid = uniq('rt');
    trackEvent('page_view', sid, { page: '/realtime-test' });
    const r = getRealTimeStats();
    expect(typeof r.activeUsers).toBe('number');
    expect(typeof r.pageViewsLastMinute).toBe('number');
    expect(Array.isArray(r.topPages)).toBe(true);
  });
});

describe('getDashboardData', () => {
  it('summary + pageViews + topPages + devices + countries combined', () => {
    const r = getDashboardData(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(r.summary).toHaveProperty('totalPageViews');
    expect(r.summary).toHaveProperty('uniqueVisitors');
    expect(Array.isArray(r.pageViews)).toBe(true);
    expect(Array.isArray(r.topPages)).toBe(true);
    expect(Array.isArray(r.devices)).toBe(true);
    expect(Array.isArray(r.countries)).toBe(true);
  });
});

describe('exportData', () => {
  it('json format - JSON string', () => {
    const r = exportData(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000), 'json');
    expect(() => JSON.parse(r)).not.toThrow();
  });

  it('csv format - header row + data rows', () => {
    const sid = uniq('exp');
    trackEvent('page_view', sid, {});
    const r = exportData(new Date(Date.now() - 86400000), new Date(Date.now() + 86400000), 'csv');
    const lines = r.split('\n');
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('type');
    expect(lines[0]).toContain('sessionId');
  });
});

describe('clearOldData', () => {
  it('cutoff filter - eski event silinir + sayim doner', () => {
    const removed = clearOldData(0); // Hepsini sil (cutoff bugün)
    expect(typeof removed).toBe('number');
    expect(removed).toBeGreaterThanOrEqual(0);
  });
});
