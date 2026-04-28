import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const routeMethods = [
  { route: '/admin/flags', methods: ['get'] },
  { route: '/admin/import', methods: ['post'] },
  { route: '/admin/loyalty/award', methods: ['post'] },
  { route: '/admin/loyalty/rewards', methods: ['get'] },
  { route: '/admin/messages/{id}/status', methods: ['post'] },
  { route: '/admin/moderation', methods: ['get'] },
  { route: '/admin/moderation/actions', methods: ['post'] },
  { route: '/admin/moderation/flags', methods: ['get'] },
  { route: '/admin/moderation/queue', methods: ['get'] },
  { route: '/admin/moderation/reports', methods: ['get'] },
  { route: '/admin/moderation/stats', methods: ['get'] },
  { route: '/admin/monitoring', methods: ['get'] },
  { route: '/admin/monitoring/ack', methods: ['post'] },
  { route: '/admin/monitoring/dashboard', methods: ['get'] },
  { route: '/admin/performance/recommendations', methods: ['get'] },
  { route: '/admin/performance/summary', methods: ['get'] },
  { route: '/admin/pharmacies', methods: ['get'] },
  { route: '/admin/places', methods: ['get'] },
  { route: '/admin/places/create', methods: ['post'] },
  { route: '/admin/places/lifecycle', methods: ['get'] },
  { route: '/admin/places/lifecycle/export', methods: ['get'] },
  { route: '/admin/places/lifecycle/sla', methods: ['get'] },
  { route: '/admin/quotas/{userId}', methods: ['get'] },
  { route: '/admin/recipes', methods: ['get'] },
  { route: '/admin/reports/generate', methods: ['post'] },
] as const;

describe('openapi P2 admin operations contract', () => {
  it('keeps the second P2 admin operations route batch documented', async () => {
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
