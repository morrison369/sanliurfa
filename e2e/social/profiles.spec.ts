import { test, expect } from '@playwright/test';

test.describe('Social Features - User Profiles', () => {
  let userId: string;
  let userToken: string;

  test.beforeAll(async ({ request }) => {
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `profile-user-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Profile Test User'
      }
    });
    const { data } = await registerRes.json();
    userId = data.id;
    userToken = data.token;
  });

  test('GET /api/users/:id/profile - public profile', async ({ request }) => {
    const response = await request.get(`/api/users/${userId}/profile`);

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('username');
    expect(data).toHaveProperty('fullName');
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('reviewsCount');
    expect(data.stats).toHaveProperty('badgesCount');
    expect(data.stats).toHaveProperty('tier');
  });

  test('GET /api/leaderboards/users - top users', async ({ request }) => {
    const response = await request.get('/api/leaderboards/users?limit=10');

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(Array.isArray(data)).toBeTruthy();

    if (data.length > 0) {
      expect(data[0]).toHaveProperty('rank');
      expect(data[0]).toHaveProperty('username');
      expect(data[0]).toHaveProperty('points');
    }
  });

  test('GET /api/leaderboards/users - supports sorting', async ({ request }) => {
    const pointsRes = await request.get('/api/leaderboards/users?sortBy=points');
    const reviewsRes = await request.get('/api/leaderboards/users?sortBy=reviews');

    expect(pointsRes.ok()).toBeTruthy();
    expect(reviewsRes.ok()).toBeTruthy();

    const pointsData = await pointsRes.json();
    const reviewsData = await reviewsRes.json();

    expect(pointsData.data).toHaveLength(pointsData.data.length);
    expect(reviewsData.data).toHaveLength(reviewsData.data.length);
  });

  test('GET /api/users/:id/mentions - user mentions', async ({ request }) => {
    const response = await request.get(`/api/users/${userId}/mentions`, {
      headers: { 'Cookie': `auth-token=${userToken}` }
    });

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /api/users/:id/mentions - requires auth', async ({ request }) => {
    const response = await request.get(`/api/users/${userId}/mentions`);

    expect(response.status()).toBe(401);
  });
});
