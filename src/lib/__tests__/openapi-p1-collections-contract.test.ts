import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const p1CollectionRoutes = [
  '/collections',
  '/collections/{id}',
  '/collections/{id}/follow',
  '/collections/{id}/followers/check',
  '/collections/{id}/items',
];

describe('openapi P1 collections contract', () => {
  it('keeps first P1 collection routes documented with GET responses', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of p1CollectionRoutes) {
      expect(spec?.paths?.[route]?.get, route).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['200'], `${route} 200`).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });
});
