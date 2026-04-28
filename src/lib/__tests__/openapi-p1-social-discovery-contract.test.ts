import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const getRoutes = [
  '/feed',
  '/feed/activity',
  '/feed/users/{userId}',
  '/followers',
  '/followers/{id}',
  '/followers/stats',
  '/following',
  '/following/check',
  '/following/unfollow',
  '/leaderboard',
  '/leaderboards',
  '/leaderboards/badges',
  '/leaderboards/users',
];

describe('openapi P1 social discovery contract', () => {
  it('keeps feed, follower, following and leaderboard P1 routes documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of getRoutes) {
      expect(spec?.paths?.[route]?.get, route).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['200'], `${route} 200`).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });
});
