/**
 * Unit Tests - analytics-realtime/index.ts vi.mock postgres
 *
 * - trackActivity in-memory Map (sessionId → lastSeen + data)
 * - trackPageView 1-hour rolling window (auto cleanup older entries)
 * - trackEvent counter increment
 * - getRealtimeMetrics 5-minute active user timeout + DB Promise.all 4-parallel
 * - getRealtimeMetrics topPages from in-memory aggregation (sorted top 10)
 * - getTimeSeries pageviews vs custom event_type (different SQL paths)
 * - getConversionFunnel previous step % calculation
 * - broadcastMetrics WebSocket readyState=1 filter
 *
 * NOTE: Module-level state persists between tests; reset via re-importing or beforeEach cleanup.
 *
 * vi.hoisted - postgres mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [] });
});

import {
  trackActivity,
  trackPageView,
  trackEvent,
  getRealtimeMetrics,
  getTimeSeries,
  getConversionFunnel,
  broadcastMetrics,
} from '../analytics-realtime';

describe('trackActivity / trackPageView / trackEvent (in-memory store)', () => {
  it('trackActivity stores sessionId with timestamp', async () => {
    trackActivity('s-1', { page: '/' });
    trackActivity('s-2', { page: '/about' });
    queryMock.mockResolvedValue({ rows: [{ count: '0' }] });
    const m = await getRealtimeMetrics();
    expect(m.activeUsers).toBeGreaterThanOrEqual(2);
  });

  it('trackPageView accumulates + topPages sorted by frequency', async () => {
    trackPageView('/popular');
    trackPageView('/popular');
    trackPageView('/popular');
    trackPageView('/less-popular');
    queryMock.mockResolvedValue({ rows: [] });
    const m = await getRealtimeMetrics();
    expect(m.topPages[0].path).toBe('/popular');
    expect(m.topPages[0].views).toBeGreaterThanOrEqual(3);
  });

  it('trackEvent counter increment cumulative', async () => {
    trackEvent('login');
    trackEvent('login');
    trackEvent('signup');
    queryMock.mockResolvedValue({ rows: [] });
    const m = await getRealtimeMetrics();
    const loginEvent = m.events.find(e => e.name === 'login');
    expect(loginEvent?.count).toBeGreaterThanOrEqual(2);
  });
});

describe('getRealtimeMetrics', () => {
  it('Promise.all parallel queries (active users + page views + devices + geo)', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // dbActiveUsers
      .mockResolvedValueOnce({ rows: [{ count: '120' }] }) // dbPageViews
      .mockResolvedValueOnce({ rows: [{ device: 'mobile', count: '80' }, { device: 'desktop', count: '40' }] })
      .mockResolvedValueOnce({ rows: [{ country: 'TR', city: 'Şanlıurfa', count: '50' }] });

    const m = await getRealtimeMetrics();
    expect(m.pageViews).toBe(120);
    expect(m.deviceBreakdown).toEqual({ mobile: 80, desktop: 40 });
    expect(m.geoData).toHaveLength(1);
    expect(m.geoData[0].country).toBe('TR');
  });

  it('activeUsers - max(in-memory, DB)', async () => {
    trackActivity('s-only-1', { page: '/' });
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // DB has 100
      .mockResolvedValueOnce({ rows: [{ count: '50' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const m = await getRealtimeMetrics();
    expect(m.activeUsers).toBe(100); // DB > in-memory
  });

  it('deviceBreakdown - "unknown" fallback for null device', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ device: null, count: '5' }] })
      .mockResolvedValueOnce({ rows: [] });
    const m = await getRealtimeMetrics();
    expect(m.deviceBreakdown.unknown).toBe(5);
  });
});

describe('getTimeSeries', () => {
  it('pageviews uses page_views table (no event_type param)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ timestamp: new Date(), value: '10' }] });
    await getTimeSeries('pageviews');
    const call = queryMock.mock.calls[0];
    expect(call[0]).toContain('FROM page_views');
    expect(call[1]).toEqual([24]); // default hours
  });

  it('custom event - engagement_events with event_type filter', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getTimeSeries('signup', '1m', 12);
    const call = queryMock.mock.calls[0];
    expect(call[0]).toContain('FROM engagement_events');
    expect(call[1]).toEqual([12, 'signup']);
  });

  it('parseInt result conversion', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ timestamp: new Date(), value: '42' }] });
    const r = await getTimeSeries('pageviews');
    expect(r[0].value).toBe(42);
    expect(typeof r[0].value).toBe('number');
  });
});

describe('getConversionFunnel', () => {
  it('first step always 100%, subsequent calculated as % of previous', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '1000' }] })
      .mockResolvedValueOnce({ rows: [{ count: '500' }] })
      .mockResolvedValueOnce({ rows: [{ count: '100' }] });

    const r = await getConversionFunnel(['view', 'click', 'purchase']);
    expect(r[0].conversionRate).toBe(100); // first
    expect(r[1].conversionRate).toBe(50);  // 500/1000
    expect(r[2].conversionRate).toBe(20);  // 100/500
  });

  it('zero previousCount → 100% (no division by zero)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const r = await getConversionFunnel(['nobody-here']);
    expect(r[0].conversionRate).toBe(100);
  });
});

describe('broadcastMetrics WebSocket', () => {
  it('only sends to clients with readyState=1 (OPEN)', () => {
    const send1 = vi.fn();
    const send2 = vi.fn();
    const send3 = vi.fn();
    const clients = new Set([
      { readyState: 1, send: send1 }, // open
      { readyState: 0, send: send2 }, // connecting
      { readyState: 3, send: send3 }, // closed
    ]);
    const metrics = {
      activeUsers: 10, pageViews: 5, uniqueVisitors: 10,
      topPages: [], topReferrers: [], deviceBreakdown: {}, geoData: [], events: [],
    };
    broadcastMetrics(clients, metrics);
    expect(send1).toHaveBeenCalledOnce();
    expect(send2).not.toHaveBeenCalled();
    expect(send3).not.toHaveBeenCalled();
  });

  it('message envelope has type/timestamp/data', () => {
    const sendMock = vi.fn();
    broadcastMetrics(
      new Set([{ readyState: 1, send: sendMock }]),
      {
        activeUsers: 1, pageViews: 0, uniqueVisitors: 0,
        topPages: [], topReferrers: [], deviceBreakdown: {}, geoData: [], events: [],
      }
    );
    const message = JSON.parse(sendMock.mock.calls[0][0]);
    expect(message.type).toBe('metrics');
    expect(message.timestamp).toBeDefined();
    expect(message.data.activeUsers).toBe(1);
  });
});
