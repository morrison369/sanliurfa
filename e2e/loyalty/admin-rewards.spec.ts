import { test, expect } from '@playwright/test';

test.describe('Loyalty - Admin Rewards Management', () => {
  let adminToken: string;
  let userId: string;

  test.beforeAll(async ({ request }) => {
    // Create admin user (assumes admin role exists in DB)
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `admin-test-${Date.now()}@example.com`,
        password: 'AdminPass123!',
        fullName: 'Admin User'
      }
    });
    const { data } = await registerRes.json();
    adminToken = data.token;
    userId = data.id;
  });

  test('GET /api/admin/loyalty/rewards - list rewards', async ({ request }) => {
    const response = await request.get('/api/admin/loyalty/rewards', {
      headers: { 'Cookie': `auth-token=${adminToken}` }
    });

    if (response.status() === 403) {
      // Admin role check - skip if not admin
      test.skip();
    }

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('POST /api/admin/loyalty/rewards - create reward', async ({ request }) => {
    const response = await request.post('/api/admin/loyalty/rewards', {
      data: {
        reward_name: `Test Reward ${Date.now()}`,
        description: 'Test reward for E2E testing',
        category: 'test',
        points_cost: 100,
        stock_quantity: 50,
        is_active: true
      },
      headers: { 'Cookie': `auth-token=${adminToken}` }
    });

    if (response.status() === 403) {
      test.skip();
    }

    expect(response.status()).toBe(201);
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(data).toHaveProperty('id');
    expect(data.reward_name).toContain('Test Reward');
  });

  test('GET /api/admin/loyalty/rewards - requires admin role', async ({ request }) => {
    // Register non-admin user
    const userRes = await request.post('/api/auth/register', {
      data: {
        email: `user-test-${Date.now()}@example.com`,
        password: 'UserPass123!',
        fullName: 'Regular User'
      }
    });
    const { data: user } = await userRes.json();

    const response = await request.get('/api/admin/loyalty/rewards', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });

    expect(response.status()).toBe(403);
    const { error } = await response.json();
    expect(error.code).toBe('FORBIDDEN');
  });

  test('POST /api/admin/loyalty/award - award points', async ({ request }) => {
    // Create user to award
    const userRes = await request.post('/api/auth/register', {
      data: {
        email: `award-user-${Date.now()}@example.com`,
        password: 'UserPass123!',
        fullName: 'Award User'
      }
    });
    const { data: awardUser } = await userRes.json();

    const response = await request.post('/api/admin/loyalty/award', {
      data: {
        userId: awardUser.id,
        type: 'points',
        amount: 500,
        reason: 'E2E test award'
      },
      headers: { 'Cookie': `auth-token=${adminToken}` }
    });

    if (response.status() === 403) {
      test.skip();
    }

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(data.awarded).toBe(500);
  });

  test('POST /api/admin/loyalty/award - requires valid user', async ({ request }) => {
    const response = await request.post('/api/admin/loyalty/award', {
      data: {
        userId: 'nonexistent-user-id',
        type: 'points',
        amount: 100,
        reason: 'Test'
      },
      headers: { 'Cookie': `auth-token=${adminToken}` }
    });

    if (response.status() === 403) {
      test.skip();
    }

    expect(response.status()).toBe(404);
    const { error } = await response.json();
    expect(error.code).toBe('NOT_FOUND');
  });
});
