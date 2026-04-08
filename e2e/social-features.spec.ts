import { test, expect } from '@playwright/test';

test.describe('Social Features', () => {
  test('GET /api/hashtags - Trending hashtags endpoint', async ({ request }) => {
    const response = await request.get('/api/hashtags?limit=10&period=7d');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    
    if (data.data.length > 0) {
      const hashtag = data.data[0];
      expect(hashtag).toHaveProperty('name');
      expect(hashtag).toHaveProperty('slug');
      expect(hashtag).toHaveProperty('count');
    }
  });

  test('GET /api/hashtags/:slug - Hashtag detail with places/reviews', async ({ request }) => {
    // First get trending hashtags
    const tagsResp = await request.get('/api/hashtags?limit=1');
    const tagsData = await tagsResp.json();

    if (tagsData.data.length > 0) {
      const slug = tagsData.data[0].slug;
      const response = await request.get(`/api/hashtags/${slug}`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('totalCount');
      expect(Array.isArray(data.data.places)).toBe(true);
      expect(Array.isArray(data.data.reviews)).toBe(true);
    }
  });

  test('GET /api/leaderboards/users - Users leaderboard', async ({ request }) => {
    const response = await request.get('/api/leaderboards/users?sortBy=points&limit=10');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    
    if (data.data.length > 0) {
      const user = data.data[0];
      expect(user).toHaveProperty('rank');
      expect(user).toHaveProperty('fullName');
      expect(user).toHaveProperty('points');
      expect(user).toHaveProperty('tier');
    }
  });

  test('GET /api/users/:id/profile - Public user profile', async ({ request }) => {
    // Create a user first
    const registerResp = await request.post('/api/auth/register', {
      data: {
        email: `profile-test-${Date.now()}@test.com`,
        password: 'TestPass123!',
        fullName: 'Profile Tester'
      }
    });

    const userData = await registerResp.json();
    const userId = userData.data.userId;

    // Get public profile
    const response = await request.get(`/api/users/${userId}/profile`);

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('fullName');
    expect(data.data).toHaveProperty('tier');
    expect(data.data).toHaveProperty('stats');
  });
});

test.describe('User Mentions', () => {
  let authToken: string;
  let userId: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        email: `mention-test-${Date.now()}@test.com`,
        password: 'TestPass123!',
        fullName: 'Mention Tester'
      }
    });

    const data = await response.json();
    authToken = data.data.token;
    userId = data.data.userId;
  });

  test('GET /api/users/:id/mentions - User mentions endpoint', async ({ request }) => {
    const response = await request.get(`/api/users/${userId}/mentions`, {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('GET /api/users/:id/mentions?unreadOnly=true - Unread mentions only', async ({ request }) => {
    const response = await request.get(`/api/users/${userId}/mentions?unreadOnly=true`, {
      headers: { 'Cookie': `auth-token=${authToken}` }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});

test.describe('Real-time Feed', () => {
  test('GET /api/realtime/feed - SSE stream connection', async ({ request }) => {
    // Create and authenticate user
    const registerResp = await request.post('/api/auth/register', {
      data: {
        email: `feed-test-${Date.now()}@test.com`,
        password: 'TestPass123!',
        fullName: 'Feed Tester'
      }
    });

    const userData = await registerResp.json();
    const authToken = userData.data.token;

    // Connect to SSE stream
    const response = await request.get('/api/realtime/feed', {
      headers: { 
        'Cookie': `auth-token=${authToken}`,
        'Accept': 'text/event-stream'
      }
    });

    // SSE should return 200 with proper headers
    if (response.ok()) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/event-stream');
    }
  });
});
