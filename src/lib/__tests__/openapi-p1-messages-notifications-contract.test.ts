import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const getRoutes = [
  '/messages',
  '/messages/{conversationId}',
  '/messages/{conversationId}/read',
  '/messages/unread-count',
  '/notifications',
  '/notifications/{id}',
  '/notifications/center',
  '/notifications/drafts',
  '/notifications/drafts/{id}',
  '/notifications/history',
  '/notifications/preferences',
];

const postRoutes = [
  '/notifications/{id}/read',
  '/notifications/clear',
  '/notifications/draft',
  '/notifications/mark-all-read',
  '/notifications/push/subscribe',
  '/notifications/read-all',
];

describe('openapi P1 messages and notifications contract', () => {
  it('keeps messages and notifications P1 GET routes documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of getRoutes) {
      expect(spec?.paths?.[route]?.get, route).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['200'], `${route} 200`).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });

  it('keeps notifications P1 POST routes documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of postRoutes) {
      expect(spec?.paths?.[route]?.post, route).toBeDefined();
      expect(spec?.paths?.[route]?.post?.responses?.['200'], `${route} 200`).toBeDefined();
      expect(spec?.paths?.[route]?.post?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });
});
