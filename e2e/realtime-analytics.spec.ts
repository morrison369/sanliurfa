import { test, expect } from '@playwright/test';

test.describe('Real-time Analytics', () => {
  test('GET /api/realtime/analytics - Admin analytics stream', async ({ request }) => {
    // Note: This test checks if endpoint exists and returns proper headers
    // Actual admin auth would be needed for full test
    
    const response = await request.get('/api/realtime/analytics', {
      headers: {
        'Accept': 'text/event-stream'
      }
    });

    // Should be accessible (might return 401 if auth required)
    expect([200, 401]).toContain(response.status());

    if (response.ok()) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/event-stream');
      
      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toContain('no-cache');
    }
  });

  test('GET /api/metrics - Aggregated metrics dashboard', async ({ request }) => {
    const response = await request.get('/api/metrics');

    // Might be admin-only (401) or public (200)
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('requestMetrics');
      expect(data.data).toHaveProperty('cacheMetrics');
      expect(data.data).toHaveProperty('slowestEndpoints');
    } else if (response.status() === 401 || response.status() === 403) {
      // Expected if admin-only
      expect([401, 403]).toContain(response.status());
    }
  });

  test('GET /api/performance - Performance dashboard', async ({ request }) => {
    const response = await request.get('/api/performance');

    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('slowQueries');
      expect(data.data).toHaveProperty('slowOperations');
      expect(data.data).toHaveProperty('poolUtilization');
    } else {
      // Expected if admin-only
      expect([401, 403]).toContain(response.status());
    }
  });
});

test.describe('Health & Observability', () => {
  test('GET /api/health - Basic health check', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('status');
    expect(data.data).toHaveProperty('database');
    expect(data.data).toHaveProperty('redis');
    expect(data.data.database).toHaveProperty('connected');
    expect(data.data.redis).toHaveProperty('connected');
  });

  test('Response includes X-Request-ID header', async ({ request }) => {
    const response = await request.get('/api/places');

    expect(response.headers()['x-request-id']).toBeTruthy();
  });

  test('Error responses include request ID', async ({ request }) => {
    const response = await request.get('/api/users/invalid-uuid/profile');

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.requestId).toBeTruthy();
  });
});
