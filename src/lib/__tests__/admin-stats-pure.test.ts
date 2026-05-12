/**
 * Unit Tests - admin/stats.ts vi.mock postgres
 *
 * - getAdminDashboardStats Promise.all 6-parallel (overview/users/content/engagement/moderation/system)
 * - period parameter affects startDate (today / week / month)
 * - getOverviewStats single subquery aggregate (7 counts) + parseInt mapping
 * - getUserStats Promise.all 5 queries (tier/device/country/growth/retention) + churnRate = 100 - retentionRate
 * - getContentStats Promise.all 6 queries (categories/status/ratings/topViewed/topRated/pending)
 * - getEngagementStats bounce rate calculation + division by zero guard
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
  // Default: every query returns empty rows[0] with all-zero counts
  queryMock.mockResolvedValue({
    rows: [{
      total_users: '0', new_users_today: '0', total_places: '0', new_places_today: '0',
      total_reviews: '0', new_reviews_today: '0', active_users_today: '0',
      pending_reports: '0', flagged_content: '0', banned_users: '0', moderated_today: '0',
      total: '0', bounced: '0', total_page_views: '0', avg_duration: '0',
      searches: '0', shares: '0', favorites: '0', count: '0',
      active_users: '0',
    }],
  });
});

import { getAdminDashboardStats } from '../admin/stats';

describe('getAdminDashboardStats', () => {
  it('Promise.all 6-parallel + period default "today"', async () => {
    const r = await getAdminDashboardStats();
    expect(r.overview).toBeDefined();
    expect(r.users).toBeDefined();
    expect(r.content).toBeDefined();
    expect(r.engagement).toBeDefined();
    expect(r.moderation).toBeDefined();
    expect(r.system).toBeDefined();
  });

  it('period "week" - startDate = 7 days ago', async () => {
    await getAdminDashboardStats('week');
    // First query is getOverviewStats with $1 = startDate
    const startDateParam = queryMock.mock.calls[0][1][0] as Date;
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    expect(startDateParam.getTime()).toBeLessThanOrEqual(Date.now() - 6 * 86400000);
    expect(startDateParam.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo - 86400000);
  });

  it('period "month" - startDate = 1st of current month', async () => {
    await getAdminDashboardStats('month');
    const startDateParam = queryMock.mock.calls[0][1][0] as Date;
    expect(startDateParam.getDate()).toBe(1);
  });

  it('overview - parseInt mapping for all 7 counts', async () => {
    queryMock
      // overview
      .mockResolvedValueOnce({
        rows: [{
          total_users: '1500', new_users_today: '12', total_places: '450', new_places_today: '5',
          total_reviews: '8000', new_reviews_today: '30', active_users_today: '230',
        }],
      })
      // user stats: 5 queries
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ active_users: '0', total_users: '0' }] });

    const r = await getAdminDashboardStats('today');
    expect(r.overview.totalUsers).toBe(1500);
    expect(r.overview.newUsersToday).toBe(12);
    expect(r.overview.activeUsersToday).toBe(230);
    expect(typeof r.overview.totalPlaces).toBe('number');
  });
});

describe('getUserStats - retention math', () => {
  it('retentionRate = (active / total) * 100 + churnRate = 100 - retention', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total_users: '0', new_users_today: '0', total_places: '0', new_places_today: '0', total_reviews: '0', new_reviews_today: '0', active_users_today: '0' }] }) // overview
      .mockResolvedValueOnce({ rows: [{ tier: 'free', count: '900' }, { tier: 'premium', count: '100' }] })
      .mockResolvedValueOnce({ rows: [{ device_type: 'mobile', count: '700' }] })
      .mockResolvedValueOnce({ rows: [{ country: 'TR', count: '950' }] })
      .mockResolvedValueOnce({ rows: [{ count: '5' }, { count: '7' }, { count: '12' }] })
      .mockResolvedValueOnce({ rows: [{ active_users: '300', total_users: '1000' }] }); // retention 30%

    const r = await getAdminDashboardStats('today');
    expect(r.users.retentionRate).toBe(30);
    expect(r.users.churnRate).toBe(70);
    expect(r.users.byTier).toEqual({ free: 900, premium: 100 });
    expect(r.users.byDevice).toEqual({ mobile: 700 });
    expect(r.users.byCountry).toEqual({ TR: 950 });
    expect(r.users.growth7Days).toEqual([5, 7, 12]);
  });

  it('totalUsers 0 → retentionRate 0 (no division by zero)', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total_users: '0', new_users_today: '0', total_places: '0', new_places_today: '0', total_reviews: '0', new_reviews_today: '0', active_users_today: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ active_users: '0', total_users: '0' }] });

    const r = await getAdminDashboardStats('today');
    expect(r.users.retentionRate).toBe(0);
    expect(r.users.churnRate).toBe(100);
  });
});

describe('getEngagementStats - bounce rate math', () => {
  it('bounceRate = (bounced / total) * 100 + division by zero guard', async () => {
    // overview + user (6) + content (6) + engagement (3)
    queryMock
      .mockResolvedValueOnce({ rows: [{ total_users: '0', new_users_today: '0', total_places: '0', new_places_today: '0', total_reviews: '0', new_reviews_today: '0', active_users_today: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ active_users: '0', total_users: '0' }] })
      // content: 6 queries
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      // engagement: 3 queries
      .mockResolvedValueOnce({ rows: [{ searches: '50', shares: '20', favorites: '10' }] })
      .mockResolvedValueOnce({ rows: [{ avg_duration: '45000' }] }) // 45 sec in ms
      .mockResolvedValueOnce({ rows: [{ bounced: '300', total: '1000', total_page_views: '2500' }] });

    const r = await getAdminDashboardStats('today');
    expect(r.engagement.bounceRate).toBe(30);
    expect(r.engagement.avgPagesPerSession).toBe(2.5);
    expect(r.engagement.avgSessionDuration).toBe(45); // 45000ms / 1000 rounded
    expect(r.engagement.searchesToday).toBe(50);
    expect(r.engagement.sharesToday).toBe(20);
    expect(r.engagement.favoritesToday).toBe(10);
  });

  it('total sessions 0 → bounceRate 0 + avgPagesPerSession 0', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total_users: '0', new_users_today: '0', total_places: '0', new_places_today: '0', total_reviews: '0', new_reviews_today: '0', active_users_today: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ active_users: '0', total_users: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ searches: '0', shares: '0', favorites: '0' }] })
      .mockResolvedValueOnce({ rows: [{ avg_duration: '0' }] })
      .mockResolvedValueOnce({ rows: [{ bounced: '0', total: '0', total_page_views: '0' }] });

    const r = await getAdminDashboardStats('today');
    expect(r.engagement.bounceRate).toBe(0);
    expect(r.engagement.avgPagesPerSession).toBe(0);
  });
});

describe('getContentStats - placesByCategory map shape', () => {
  it('rating parseFloat for topRated', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total_users: '0', new_users_today: '0', total_places: '0', new_places_today: '0', total_reviews: '0', new_reviews_today: '0', active_users_today: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ active_users: '0', total_users: '0' }] })
      // content: 6 queries
      .mockResolvedValueOnce({ rows: [{ category_id: 'c-1', count: '50' }, { category_id: 'c-2', count: '25' }] })
      .mockResolvedValueOnce({ rows: [{ status: 'active', count: '100' }, { status: 'pending', count: '5' }] })
      .mockResolvedValueOnce({ rows: [{ rating: 5, count: '40' }, { rating: 4, count: '60' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'p-1', name: 'Top1', views: 5000 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'p-1', name: 'Top1', rating: '4.85' }] })
      .mockResolvedValueOnce({ rows: [{ count: '7' }] });

    const r = await getAdminDashboardStats('today');
    expect(r.content.placesByCategory).toEqual({ 'c-1': 50, 'c-2': 25 });
    expect(r.content.placesByStatus).toEqual({ active: 100, pending: 5 });
    expect(r.content.topRatedPlaces[0].rating).toBe(4.85);
    expect(r.content.pendingApprovals).toBe(7);
  });
});
