import { test, expect } from '@playwright/test';

test.describe('Loyalty - Achievements API', () => {
  test('GET /api/loyalty/achievements - get user achievements', async ({ request }) => {
    // Create user and get auth token
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `test-achievements-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Test User'
      }
    });
    expect(registerRes.ok()).toBeTruthy();
    const { data: user } = await registerRes.json();

    // Get achievements (should be empty initially)
    const response = await request.get('/api/loyalty/achievements', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /api/loyalty/achievements?view=stats - get achievement statistics', async ({ request }) => {
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `test-achievement-stats-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Test User'
      }
    });
    const { data: user } = await registerRes.json();

    const response = await request.get('/api/loyalty/achievements?view=stats', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });

    expect(response.ok()).toBeTruthy();
    const { data } = await response.json();
    expect(data).toHaveProperty('total_unlocked');
    expect(data).toHaveProperty('total_available');
    expect(data).toHaveProperty('unlock_percentage');
    expect(data).toHaveProperty('by_category');
  });

  test('GET /api/loyalty/achievements?view=unviewed - get unviewed achievements', async ({ request }) => {
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `test-unviewed-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Test User'
      }
    });
    const { data: user } = await registerRes.json();

    const response = await request.get('/api/loyalty/achievements?view=unviewed', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('POST /api/loyalty/achievements - mark achievement as viewed', async ({ request }) => {
    // Register user
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `test-mark-viewed-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Test User'
      }
    });
    const { data: user } = await registerRes.json();

    // Get achievements first
    const getRes = await request.get('/api/loyalty/achievements', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });
    const { data: achievements } = await getRes.json();

    if (achievements.length > 0) {
      // Mark as viewed
      const markRes = await request.post('/api/loyalty/achievements', {
        data: { userAchievementId: achievements[0].id },
        headers: { 'Cookie': `auth-token=${user.token}` }
      });

      expect(markRes.ok()).toBeTruthy();
      const { success } = await markRes.json();
      expect(success).toBe(true);
    }
  });

  test('GET /api/loyalty/achievements - requires auth', async ({ request }) => {
    const response = await request.get('/api/loyalty/achievements');

    expect(response.status()).toBe(401);
    const { error } = await response.json();
    expect(error.code).toBe('UNAUTHORIZED');
  });
});
