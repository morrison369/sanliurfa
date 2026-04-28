import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const routeMethods = [
  { route: '/achievements', methods: ['get'] },
  { route: '/activity', methods: ['get'] },
  { route: '/admin/alerts', methods: ['get'] },
  { route: '/admin/analytics', methods: ['get'] },
  { route: '/admin/audit-logs', methods: ['get'] },
  { route: '/admin/badges/award', methods: ['post'] },
  { route: '/admin/blog', methods: ['get'] },
  { route: '/admin/blog/{id}', methods: ['get'] },
  { route: '/admin/blog/categories', methods: ['get'] },
  { route: '/admin/blog/stats', methods: ['get'] },
  { route: '/admin/blog/tags', methods: ['get'] },
  { route: '/admin/bulk-action', methods: ['post'] },
  { route: '/admin/bus-routes', methods: ['get'] },
  { route: '/admin/city-content-agents', methods: ['get', 'post'] },
  { route: '/admin/content-bot/generate', methods: ['post'] },
  { route: '/admin/dashboard', methods: ['get'] },
  { route: '/admin/dashboard/overview', methods: ['get'] },
  { route: '/admin/deployment/status', methods: ['get'] },
  { route: '/admin/exports/token', methods: ['delete', 'get', 'post'] },
  { route: '/admin/exports/token/clipboard', methods: ['post'] },
] as const;

describe('openapi P2 admin core contract', () => {
  it('keeps the first P2 admin/general route batch documented', async () => {
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
