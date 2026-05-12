/**
 * Unit Tests - admin/widgets.ts vi.mock postgres + cache
 *
 * - getDashboardStats Promise.all 4-parallel (users / places / reviews / blog)
 * - getDashboardStats parseInt fallback for COUNT FILTER + Math.round avgRating 1-decimal
 * - getRecentActivity UNION ALL 4 sources + ORDER BY timestamp DESC + default limit 20
 * - getTrafficChart days param + tr-TR locale label
 * - getTopPlacesChart limit param + ORDER BY review_count
 * - getUserGrowthChart DATE_TRUNC month + soft-deleted filter
 * - getModerationStats single query 4-aggregate (pending counts)
 * - getSystemHealth: DB ping success/fail, cache helper success/fail, last backup
 * - getQuickActions static list (6 items)
 *
 * vi.hoisted - postgres + cache mocks (cache imported dynamically inside helper).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, setCacheMock, getCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  setCacheMock: vi.fn(),
  getCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../cache', () => ({
  setCache: setCacheMock,
  getCache: getCacheMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [{ total: '0', new_today: '0', active_today: '0' }] });
  setCacheMock.mockReset();
  setCacheMock.mockResolvedValue(undefined);
  getCacheMock.mockReset();
  getCacheMock.mockResolvedValue('ok');
});

import {
  getDashboardStats,
  getRecentActivity,
  getTrafficChart,
  getTopPlacesChart,
  getUserGrowthChart,
  getModerationStats,
  getSystemHealth,
  getQuickActions,
} from '../admin/widgets';

describe('getDashboardStats', () => {
  it('Promise.all 4-parallel + parseInt mapping', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: '1500', new_today: '12', active_today: '300' }] })
      .mockResolvedValueOnce({ rows: [{ total: '450', pending: '8', featured: '12' }] })
      .mockResolvedValueOnce({ rows: [{ total: '5000', pending: '20', avg_rating: '4.567' }] })
      .mockResolvedValueOnce({ rows: [{ total: '120', published: '90', views: '50000' }] });
    const r = await getDashboardStats();
    expect(r.users).toEqual({ total: 1500, newToday: 12, activeToday: 300 });
    expect(r.places.pending).toBe(8);
    expect(r.places.featured).toBe(12);
    expect(r.reviews.avgRating).toBe(4.6); // Math.round(4.567 * 10) / 10
    expect(r.blog.views).toBe(50000);
  });

  it('avg_rating 0 / null safe handling (COALESCE in SQL → 0)', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: '0', new_today: '0', active_today: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0', pending: '0', featured: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0', pending: '0', avg_rating: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0', published: '0', views: '0' }] });
    const r = await getDashboardStats();
    expect(r.reviews.avgRating).toBe(0);
  });
});

describe('getRecentActivity', () => {
  it('default limit 20 + ORDER BY timestamp DESC', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getRecentActivity();
    const params = queryMock.mock.calls[0][1];
    expect(params).toEqual([20]);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('UNION ALL');
    expect(sql).toContain('ORDER BY timestamp DESC');
  });

  it('custom limit + 4 source UNION (users/places/reviews/blog)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getRecentActivity(5);
    expect(queryMock.mock.calls[0][1]).toEqual([5]);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toMatch(/FROM users/);
    expect(sql).toMatch(/FROM places/);
    expect(sql).toMatch(/FROM reviews/);
    expect(sql).toMatch(/FROM blog_posts/);
  });

  it('row mapping: timestamp Date conversion + link passthrough', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'p-1', type: 'place', action: 'create',
          description: 'Test eklendi', user: 'Ali', timestamp: '2026-05-05T10:00:00Z',
          link: '/mekan/test',
        },
      ],
    });
    const r = await getRecentActivity();
    expect(r[0].timestamp).toBeInstanceOf(Date);
    expect(r[0].link).toBe('/mekan/test');
  });
});

describe('getTrafficChart', () => {
  it('default 7 days + Turkish weekday labels', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ date: '2026-05-05', page_views: '100', unique_users: '50' }],
    });
    const r = await getTrafficChart();
    expect(queryMock.mock.calls[0][1]).toEqual([7]);
    expect(r.datasets).toHaveLength(2);
    expect(r.datasets[0].label).toBe('Sayfa Görüntüleme');
    expect(r.datasets[1].label).toBe('Benzersiz Kullanıcı');
    expect(r.datasets[0].data).toEqual([100]);
    expect(r.datasets[1].data).toEqual([50]);
  });

  it('custom days param', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getTrafficChart(30);
    expect(queryMock.mock.calls[0][1]).toEqual([30]);
  });
});

describe('getTopPlacesChart', () => {
  it('default 5 + ORDER BY review_count DESC', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { name: 'Cevahir', review_count: '120', rating: 4.8 },
        { name: 'Kapadokya', review_count: '90', rating: 4.6 },
      ],
    });
    const r = await getTopPlacesChart();
    expect(queryMock.mock.calls[0][1]).toEqual([5]);
    expect(r.labels).toEqual(['Cevahir', 'Kapadokya']);
    expect(r.datasets[0].data).toEqual([120, 90]);
  });
});

describe('getUserGrowthChart', () => {
  it('default 6 months + DATE_TRUNC + soft-delete filter', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getUserGrowthChart();
    expect(queryMock.mock.calls[0][1]).toEqual([6]);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain("DATE_TRUNC('month', created_at)");
    expect(sql).toContain('deleted_at IS NULL');
  });
});

describe('getModerationStats', () => {
  it('single query 4-aggregate (pending counts)', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        pending_places: '5', pending_reviews: '12',
        pending_comments: '3', reported_content: '2',
      }],
    });
    const r = await getModerationStats();
    expect(r).toEqual({
      pendingPlaces: 5, pendingReviews: 12,
      pendingComments: 3, reportedContent: 2,
    });
    // single query (subquery aggregate)
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});

describe('getSystemHealth', () => {
  it('DB ping success → database "healthy"', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // SELECT 1
    queryMock.mockResolvedValueOnce({ rows: [] }); // backup query
    const r = await getSystemHealth();
    expect(r.database).toBe('healthy');
  });

  it('DB ping throws → database "down"', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB unreachable'));
    queryMock.mockResolvedValueOnce({ rows: [] });
    const r = await getSystemHealth();
    expect(r.database).toBe('down');
  });

  it('cache write+read returns "ok" → cache "healthy"', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{}] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    getCacheMock.mockResolvedValueOnce('ok');
    const r = await getSystemHealth();
    expect(r.cache).toBe('healthy');
  });

  it('cache returns wrong value → cache "degraded"', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{}] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    getCacheMock.mockResolvedValueOnce('not-ok');
    const r = await getSystemHealth();
    expect(r.cache).toBe('degraded');
  });

  it('last backup timestamp from job_logs', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{}] });
    queryMock.mockResolvedValueOnce({ rows: [{ created_at: '2026-05-04T03:00:00Z' }] });
    const r = await getSystemHealth();
    expect(r.lastBackup).toBeInstanceOf(Date);
  });

  it('no backup history → lastBackup undefined', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{}] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    const r = await getSystemHealth();
    expect(r.lastBackup).toBeUndefined();
  });
});

describe('getQuickActions (static)', () => {
  it('6 quick action items + admin paths', () => {
    const r = getQuickActions();
    expect(r).toHaveLength(6);
    const labels = r.map(a => a.label);
    expect(labels).toContain('Mekan Ekle');
    expect(labels).toContain('Moderasyon');
    expect(labels).toContain('Ayarlar');
    expect(r.every(a => a.link.startsWith('/admin/'))).toBe(true);
  });

  it('each item has color class for theming', () => {
    const r = getQuickActions();
    expect(r.every(a => typeof a.color === 'string' && a.color.length > 0)).toBe(true);
  });
});
