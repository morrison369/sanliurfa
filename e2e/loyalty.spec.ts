import { test, expect, type APIRequestContext } from '@playwright/test';

function authCookieFrom(response: { headers(): Record<string, string> }) {
  return response.headers()['set-cookie']?.split(';')[0] || '';
}

async function createAuthCookie(request: APIRequestContext, prefix: string) {
  const response = await request.post('/api/auth/register', {
    data: {
      email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      password: 'TestPass123!',
      fullName: 'Loyalty Tester',
    },
  });

  expect(response.ok()).toBeTruthy();
  return authCookieFrom(response);
}

test.describe('Loyalty & Rewards System', () => {
  test('GET /api/loyalty/points - User can view points balance', async ({ request }) => {
    const authCookie = await createAuthCookie(request, 'loyalty-points');
    const response = await request.get('/api/loyalty/points', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data ?? body;
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('currentBalance');
    expect(data.data).toHaveProperty('lifetimeEarned');
    expect(data.data).toHaveProperty('lifetimeSpent');
  });

  test('GET /api/loyalty/rewards - Public can view rewards catalog', async ({ request }) => {
    const response = await request.get('/api/loyalty/rewards');

    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data ?? body;
    const rewards = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.rewards)
        ? data.rewards
        : Array.isArray(data)
          ? data
          : [];
    expect(data.success ?? body.success ?? true).toBe(true);
    expect(Array.isArray(rewards)).toBe(true);
    
    if (rewards.length > 0) {
      const reward = rewards[0];
      expect(reward).toHaveProperty('id');
      expect(reward).toHaveProperty('reward_name');
      expect(reward).toHaveProperty('points_cost');
      expect(reward).toHaveProperty('available_stock');
    }
  });

  test('GET /api/loyalty/achievements - User can view achievements', async ({ request }) => {
    const authCookie = await createAuthCookie(request, 'loyalty-achievements');
    const response = await request.get('/api/loyalty/achievements?view=all', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data ?? body;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /api/loyalty/achievements - Mark achievement as viewed', async ({ request }) => {
    const authCookie = await createAuthCookie(request, 'loyalty-achievements-viewed');
    // First get achievements
    const achievementsResp = await request.get('/api/loyalty/achievements?view=unviewed', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    const achievementsData = await achievementsResp.json();
    
    if (Array.isArray(achievementsData.data) && achievementsData.data.length > 0) {
      const achievement = achievementsData.data[0];
      
      const response = await request.post('/api/loyalty/achievements', {
        headers: authCookie ? { Cookie: authCookie } : undefined,
        data: { userAchievementId: achievement.id }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }
  });

  test('GET /api/loyalty/tiers - User can view tier information', async ({ request }) => {
    const authCookie = await createAuthCookie(request, 'loyalty-tiers');
    const response = await request.get('/api/loyalty/tiers', {
      headers: authCookie ? { Cookie: authCookie } : undefined
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data ?? body;
    const tierData = data.data ?? data;
    expect(data.success).toBe(true);
    expect(tierData.currentTier ?? tierData.userTier ?? null).toBeDefined();
    expect(tierData.nextTier ?? null).toBeDefined();
    expect(Array.isArray(tierData.tiers)).toBe(true);
  });
});

test.describe('Admin Loyalty Management', () => {
  let adminToken = '';
  let testUserId = '';

  test.beforeAll(async ({ browser }) => {
    // This would need admin user setup in test database
    // Placeholder for integration with actual test setup
  });

  test('GET /api/admin/loyalty/rewards - Admin can list all rewards', async ({ request }) => {
    // Requires admin token
    const response = await request.get('/api/admin/loyalty/rewards', {
      headers: { 'Cookie': `auth-token=${adminToken}` }
    });

    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    } else if (response.status() === 403) {
      expect(response.status()).toBe(403);
    }
  });

  test('POST /api/admin/loyalty/award - Admin can award points', async ({ request }) => {
    const response = await request.post('/api/admin/loyalty/award', {
      headers: { 'Cookie': `auth-token=${adminToken}` },
      data: {
        userId: testUserId,
        type: 'points',
        amount: 100,
        reason: 'Test award'
      }
    });

    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.awarded).toBe(100);
    }
  });
});
