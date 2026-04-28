import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const getRoutes = [
  '/social/events/stream',
  '/social/feed',
  '/social/followers',
  '/social/follows',
  '/social/match-candidates',
  '/social/matches',
  '/social/messages',
  '/social/messages/receipts',
  '/social/messages/stream',
  '/social/trending',
];

const postRoutes = ['/social/follow', '/social/messages', '/social/swipe'];

describe('openapi P1 social core contract', () => {
  it('keeps social core P1 GET routes documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of getRoutes) {
      expect(spec?.paths?.[route]?.get, route).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['200'], `${route} 200`).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });

  it('keeps social core P1 POST routes documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of postRoutes) {
      expect(spec?.paths?.[route]?.post, route).toBeDefined();
      const successResponse =
        spec?.paths?.[route]?.post?.responses?.['200'] ?? spec?.paths?.[route]?.post?.responses?.['201'];
      expect(successResponse, `${route} 200/201`).toBeDefined();
      expect(spec?.paths?.[route]?.post?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });
});
