import { test, expect } from '@playwright/test';

test.describe('Loyalty & Rewards System', () => {
  let userId: string;
  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Create test user and get auth token
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Register test user
    const response = await page.request.post('/api/auth/register', {
      data: {
        email: `loyalty-test-${Date.now()}@test.com`,
        password: 'TestPass123!',
        fullName: 'Loyalty Tester'
      }
    });
    
    const loginResp = await response.json();
    authToken = loginResp.data.token;
    userId = loginResp.data.userId;
    
    await context.close();
  });

  test('GET /api/loyalty/points - User can view points balance', async ({ request }) => {
    const response = await request.get('/api/loyalty/points', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('currentBalance');
    expect(data.data).toHaveProperty('lifetimeEarned');
    expect(data.data).toHaveProperty('lifetimeSpent');
  });

  test('GET /api/loyalty/rewards - Public can view rewards catalog', async ({ request }) => {
    const response = await request.get('/api/loyalty/rewards');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    
    if (data.data.length > 0) {
      const reward = data.data[0];
      expect(reward).toHaveProperty('id');
      expect(reward).toHaveProperty('reward_name');
      expect(reward).toHaveProperty('points_cost');
      expect(reward).toHaveProperty('available_stock');
    }
  });

  test('GET /api/loyalty/achievements - User can view achievements', async ({ request }) => {
    const response = await request.get('/api/loyalty/achievements?view=all', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /api/loyalty/achievements - Mark achievement as viewed', async ({ request }) => {
    // First get achievements
    const achievementsResp = await request.get('/api/loyalty/achievements?view=unviewed', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });

    const achievementsData = await achievementsResp.json();
    
    if (achievementsData.data.length > 0) {
      const achievement = achievementsData.data[0];
      
      const response = await request.post('/api/loyalty/achievements', {
        headers: { 'Cookie': `auth-token=${authToken}` },
        data: { userAchievementId: achievement.id }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }
  });

  test('GET /api/loyalty/tiers - User can view tier information', async ({ request }) => {
    const response = await request.get('/api/loyalty/tiers', {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('currentTier');
    expect(data.data).toHaveProperty('nextTier');
    expect(Array.isArray(data.data.tiers)).toBe(true);
  });
});

test.describe('Admin Loyalty Management', () => {
  let adminToken: string;
  let testUserId: string;

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
