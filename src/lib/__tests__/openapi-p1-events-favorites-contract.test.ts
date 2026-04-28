import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const getRoutes = [
  '/events/{id}/delete',
  '/events/{id}/details',
  '/events/{id}/rsvp',
  '/events/{id}/update',
  '/events/create',
  '/events/list',
  '/events/search',
  '/favorites',
  '/favorites/{id}',
];

const postRoutes = ['/favorites/bulk'];

describe('openapi P1 events and favorites contract', () => {
  it('keeps next P1 GET routes documented with standard responses', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const route of getRoutes) {
      expect(spec?.paths?.[route]?.get, route).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['200'], `${route} 200`).toBeDefined();
      expect(spec?.paths?.[route]?.get?.responses?.['500'], `${route} 500`).toBeDefined();
    }
  });

  it('keeps next P1 POST routes documented with standard responses', async () => {
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
