import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const routeMethods = [
  { route: '/business/trends', methods: ['get'] },
  { route: '/cache/stats', methods: ['get'] },
  { route: '/collab/sessions', methods: ['get'] },
  { route: '/comments', methods: ['get'] },
  { route: '/comments/{id}', methods: ['get'] },
  { route: '/comments/{id}/vote', methods: ['get'] },
  { route: '/contact', methods: ['get', 'post'] },
  { route: '/contact/{id}', methods: ['get'] },
  { route: '/content', methods: ['get'] },
  { route: '/content/{contentId}', methods: ['get'] },
  { route: '/content/{contentId}/publish', methods: ['get'] },
  { route: '/coupons/validate', methods: ['get'] },
  { route: '/dashboards', methods: ['get'] },
  { route: '/dashboards/{dashboardId}/widgets', methods: ['get'] },
  { route: '/discovery/recommendations', methods: ['get'] },
  { route: '/discovery/similar', methods: ['get'] },
  { route: '/discovery/trending', methods: ['get'] },
  { route: '/docs', methods: ['get'] },
  { route: '/email/campaigns', methods: ['get'] },
  { route: '/email/campaigns/{id}', methods: ['get'] },
  { route: '/email/campaigns/{id}/analytics', methods: ['get'] },
  { route: '/email/campaigns/{id}/subscribers', methods: ['get'] },
  { route: '/email/preferences', methods: ['get'] },
  { route: '/email/queue', methods: ['get'] },
  { route: '/email/send-reset', methods: ['get'] },
  { route: '/email/send-review-response', methods: ['get'] },
  { route: '/email/send-subscription', methods: ['get'] },
  { route: '/email/send-subscription-notification', methods: ['get'] },
  { route: '/email/send-test', methods: ['get'] },
  { route: '/email/send-verification', methods: ['get'] },
] as const;

describe('openapi P2 business content and email contract', () => {
  it('keeps the business, content and email P2 route batch documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const { route, methods } of routeMethods) {
      for (const method of methods) {
        const operation = spec?.paths?.[route]?.[method];
        expect(operation, `${route} ${method.toUpperCase()}`).toBeDefined();

        const responses = operation?.responses ?? {};
        const successCodes = Object.keys(responses).filter((code) => code.startsWith('2'));
        expect(successCodes.length, `${route} ${method.toUpperCase()} 2xx`).toBeGreaterThan(0);
        expect(Object.keys(responses).length, `${route} ${method.toUpperCase()} responses`).toBeGreaterThan(
          0,
        );
      }
    }
  });
});
