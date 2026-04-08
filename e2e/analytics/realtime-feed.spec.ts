import { test, expect } from '@playwright/test';

test.describe('Real-time Features - Feed SSE', () => {
  test('GET /api/realtime/feed - SSE connection', async ({ request }) => {
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `feed-user-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Feed User'
      }
    });
    const { data: user } = await registerRes.json();

    const response = await request.get('/api/realtime/feed', {
      headers: {
        'Cookie': `auth-token=${user.token}`,
        'Accept': 'text/event-stream'
      }
    });

    // SSE connections return 200
    expect([200, 304]).toContain(response.status());
    
    // Check headers
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/event-stream|text/);
  });

  test('GET /api/realtime/feed - requires authentication', async ({ request }) => {
    const response = await request.get('/api/realtime/feed', {
      headers: { 'Accept': 'text/event-stream' }
    });

    expect(response.status()).toBe(401);
  });

  test('GET /api/realtime/feed - sets proper headers', async ({ request }) => {
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: `headers-test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        fullName: 'Headers Test'
      }
    });
    const { data: user } = await registerRes.json();

    const response = await request.get('/api/realtime/feed', {
      headers: { 'Cookie': `auth-token=${user.token}` }
    });

    const headers = response.headers();
    expect(headers['cache-control']).toMatch(/no-cache/);
    expect(headers['connection']).toMatch(/keep-alive/);
  });
});
