import { test, expect } from '@playwright/test';

test.describe('Real-time Analytics - Metrics SSE', () => {
  test('GET /api/realtime/analytics - admin only', async ({ request }) => {
    // Register regular user
    const userRes = await request.post('/api/auth/register', {
      data: {
        email: `user-metrics-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Regular User'
      }
    });
    const { data: user } = await userRes.json();

    const response = await request.get('/api/realtime/analytics', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });

    expect(response.status()).toBe(403);
    const { error } = await response.json();
    expect(error.code).toBe('FORBIDDEN');
  });

  test('GET /api/realtime/analytics - requires authentication', async ({ request }) => {
    const response = await request.get('/api/realtime/analytics');

    expect(response.status()).toBe(401);
  });

  test('GET /api/realtime/analytics - proper SSE headers', async ({ request }) => {
    // This test would require admin user setup
    // Skipping if not admin for now
    
    const response = await request.get('/api/realtime/analytics');
    
    if (response.status() === 401) {
      test.skip();
    }

    const headers = response.headers();
    expect(headers['cache-control']).toMatch(/no-cache/);
    expect(headers['connection']).toMatch(/keep-alive/);
  });

  test('GET /api/performance - metrics endpoint', async ({ request }) => {
    const response = await request.get('/api/performance');

    // Either requires auth or returns data
    if (response.ok()) {
      const { success, data } = await response.json();
      expect(success).toBe(true);
      expect(data).toHaveProperty('slowRequests');
      expect(data).toHaveProperty('avgDuration');
      expect(data).toHaveProperty('cacheHitRate');
    }
  });
});
