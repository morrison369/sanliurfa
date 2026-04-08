import { test, expect } from '@playwright/test';

test.describe('Social Features - Hashtags', () => {
  test('GET /api/hashtags - list trending hashtags', async ({ request }) => {
    const response = await request.get('/api/hashtags');

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(Array.isArray(data)).toBeTruthy();
    
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('slug');
      expect(data[0]).toHaveProperty('usage_count');
    }
  });

  test('GET /api/hashtags/:slug - get hashtag details', async ({ request }) => {
    // First get trending hashtags
    const listRes = await request.get('/api/hashtags');
    const { data: hashtags } = await listRes.json();

    if (hashtags.length === 0) {
      test.skip();
    }

    const slug = hashtags[0].slug;
    const response = await request.get(`/api/hashtags/${slug}`);

    expect(response.ok()).toBeTruthy();
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('places');
    expect(data).toHaveProperty('reviews');
  });

  test('GET /api/hashtags - caching returns consistent results', async ({ request }) => {
    const res1 = await request.get('/api/hashtags');
    const res2 = await request.get('/api/hashtags');

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.data).toEqual(data2.data);
  });
});
