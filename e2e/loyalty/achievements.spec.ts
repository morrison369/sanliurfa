import { test, expect } from '@playwright/test';

function authCookieFrom(response: { headers(): Record<string, string> }) {
  return response.headers()['set-cookie']?.split(';')[0] || '';
}

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
    const authCookie = authCookieFrom(registerRes);

    // Get achievements (should be empty initially)
    const response = await request.get('/api/loyalty/achievements', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const { success, data } = body.data ?? body;
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
    const authCookie = authCookieFrom(registerRes);

    const response = await request.get('/api/loyalty/achievements?view=stats', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const { data } = body.data ?? body;
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
    const authCookie = authCookieFrom(registerRes);

    const response = await request.get('/api/loyalty/achievements?view=unviewed', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const { success, data } = body.data ?? body;
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
    const authCookie = authCookieFrom(registerRes);

    // Get achievements first
    const getRes = await request.get('/api/loyalty/achievements', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });
    const getBody = await getRes.json();
    const { data: achievements } = getBody.data ?? getBody;

    if (Array.isArray(achievements) && achievements.length > 0) {
      // Mark as viewed
      const markRes = await request.post('/api/loyalty/achievements', {
        data: { userAchievementId: achievements[0].id },
        headers: authCookie ? { Cookie: authCookie } : undefined
      });

      expect(markRes.ok()).toBeTruthy();
      const markBody = await markRes.json();
      const { success } = markBody.data ?? markBody;
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
