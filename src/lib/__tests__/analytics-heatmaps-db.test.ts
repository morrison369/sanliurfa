/**
 * Unit Tests - analytics/heatmaps.ts
 *
 * - trackHeatmapEvent INSERT params order
 * - getClickHeatmap GROUP BY x, y + ORDER BY intensity DESC + parseInt mapping
 * - getCompleteHeatmap Promise.all 3-parallel + clickPoints integration
 * - getTopPagesByInteraction 7-day window + limit
 * - cleanOldHeatmapData DELETE WHERE older than retentionDays
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
});

import {
  trackHeatmapEvent,
  getClickHeatmap,
  getCompleteHeatmap,
  getTopPagesByInteraction,
  cleanOldHeatmapData,
} from '../analytics/heatmaps';

const mkEvent = (overrides: any = {}) => ({
  pageUrl: '/mekan/balikligol',
  elementPath: 'div.card > h2',
  x: 100,
  y: 200,
  type: 'click' as const,
  timestamp: new Date(),
  sessionId: 's-1',
  viewport: { width: 1920, height: 1080 },
  deviceType: 'desktop' as const,
  ...overrides,
});

describe('trackHeatmapEvent', () => {
  it('INSERT params order', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await trackHeatmapEvent(mkEvent());
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('INSERT INTO heatmap_events');
    expect(sqlCall[1]).toEqual([
      '/mekan/balikligol',
      'div.card > h2',
      100,
      200,
      'click',
      's-1',
      1920,
      1080,
      'desktop',
    ]);
  });
});

describe('getClickHeatmap', () => {
  it('GROUP BY x, y + ORDER BY intensity DESC', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { x: '100', y: '200', intensity: '5' },
        { x: '50', y: '50', intensity: '2' },
      ],
    });
    const r = await getClickHeatmap('/mekan/x', { start: new Date('2026-01-01'), end: new Date('2026-12-31') });
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ x: 100, y: 200, intensity: 5 });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('GROUP BY x, y');
    expect(sqlCall[0]).toContain('ORDER BY intensity DESC');
    expect(sqlCall[0]).toContain("type = 'click'");
  });

  it('parseInt converts string columns', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ x: '0', y: '0', intensity: '1' }] });
    const r = await getClickHeatmap('/x', { start: new Date(), end: new Date() });
    expect(typeof r[0].x).toBe('number');
    expect(typeof r[0].intensity).toBe('number');
  });
});

describe('getCompleteHeatmap', () => {
  it('Promise.all 3-parallel + clickPoints fetched separately', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: '100' }] })
      .mockResolvedValueOnce({ rows: [{ unique: '25' }] })
      .mockResolvedValueOnce({
        rows: [
          { device_type: 'desktop', count: '60' },
          { device_type: 'mobile', count: '40' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ x: '100', y: '200', intensity: '10' }] });
    const r = await getCompleteHeatmap('/x', { start: new Date(), end: new Date() });
    expect(r.totalEvents).toBe(100);
    expect(r.uniqueVisitors).toBe(25);
    expect(r.deviceBreakdown).toEqual({ desktop: 60, mobile: 40 });
    expect(r.clickPoints).toEqual([{ x: 100, y: 200, intensity: 10 }]);
  });
});

describe('getTopPagesByInteraction', () => {
  it('7-day window + default limit 10', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getTopPagesByInteraction();
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain("INTERVAL '7 days'");
    expect(sqlCall[1]).toEqual([10]);
  });

  it('custom limit + parseInt mapping', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ page_url: '/a', interactions: '50' }, { page_url: '/b', interactions: '20' }],
    });
    const r = await getTopPagesByInteraction(5);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ pageUrl: '/a', interactions: 50 });
    expect(queryMock.mock.calls[0][1]).toEqual([5]);
  });
});

describe('cleanOldHeatmapData', () => {
  it('default 90-day retention', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const deleted = await cleanOldHeatmapData();
    expect(deleted).toBe(0);
    expect(queryMock.mock.calls[0][1]).toEqual([90]);
  });

  it('returns deleted row count', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    const deleted = await cleanOldHeatmapData(30);
    expect(deleted).toBe(3);
    expect(queryMock.mock.calls[0][1]).toEqual([30]);
  });
});
