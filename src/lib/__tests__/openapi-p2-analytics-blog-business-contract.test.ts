import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const routeMethods = [
  { route: '/analytics/events', methods: ['get'] },
  { route: '/analytics/funnels', methods: ['get'] },
  { route: '/analytics/journeys', methods: ['get'] },
  { route: '/analytics/performance', methods: ['get'] },
  { route: '/analytics/predictions', methods: ['get'] },
  { route: '/audit/log', methods: ['get'] },
  { route: '/badges', methods: ['get'] },
  { route: '/badges/definitions', methods: ['get'] },
  { route: '/billing/checkout', methods: ['post'] },
  { route: '/billing/webhook', methods: ['get'] },
  { route: '/blocking', methods: ['get'] },
  { route: '/blocking/check', methods: ['get'] },
  { route: '/blog/{id}/admin', methods: ['get'] },
  { route: '/blog/admin', methods: ['get'] },
  { route: '/blog/analytics', methods: ['get'] },
  { route: '/blog/categories', methods: ['get'] },
  { route: '/blog/comments', methods: ['get'] },
  { route: '/blog/comments/{id}', methods: ['get'] },
  { route: '/blog/comments/{id}/approve', methods: ['get'] },
  { route: '/blog/comments/{id}/reject', methods: ['get'] },
  { route: '/blog/posts', methods: ['get'] },
  { route: '/blog/posts/{id}/revisions', methods: ['get'] },
  { route: '/blog/posts/{slug}', methods: ['get'] },
  { route: '/blog/reading-history', methods: ['get'] },
  { route: '/blog/scheduled-posts', methods: ['get'] },
  { route: '/blog/search', methods: ['get'] },
  { route: '/blog/subscribe', methods: ['get'] },
  { route: '/business-metrics', methods: ['get'] },
  { route: '/business/analytics', methods: ['get'] },
  { route: '/business/insights', methods: ['get'] },
] as const;

describe('openapi P2 analytics blog and business contract', () => {
  it('keeps the analytics, blog and business P2 route batch documented', async () => {
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
