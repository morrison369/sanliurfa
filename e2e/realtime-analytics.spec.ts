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
    const response = await request.get('/api/metrics', {
      headers: {
        Accept: 'application/json'
      }
    });

    // Might be admin-only (401) or public (200)
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('requestCount');
      expect(data.data).toHaveProperty('cacheHitRate');
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
    expect([200, 503]).toContain(response.status());
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database');
    expect(data.services).toHaveProperty('redis');
    expect(data.services.database).toHaveProperty('status');
    expect(data.services.redis).toHaveProperty('status');
  });

  test('Response includes X-Request-ID header', async ({ request }) => {
    const response = await request.get('/api/places');

    expect(response.headers()['x-request-id']).toBeTruthy();
  });

  test('Error responses include request ID', async ({ request }) => {
    const response = await request.get('/api/users/invalid-uuid/profile');

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(response.headers()['x-request-id']).toBeTruthy();
    expect(data?.meta?.requestId).toBeTruthy();
  });
});
