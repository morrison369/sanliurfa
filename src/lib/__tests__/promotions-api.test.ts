import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryMock, authenticateUserMock, loggerErrorMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  authenticateUserMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../auth/middleware', () => ({
  authenticateUser: authenticateUserMock,
}));

vi.mock('../logging', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

vi.mock('../cache', () => ({
  deleteCachePattern: vi.fn(),
}));

import { GET } from '../../pages/api/promotions/index';

describe('GET /api/promotions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.mockResolvedValue({
      rows: [{ id: 'promo-1', status: 'active', place_id: 'place-1' }],
      rowCount: 1,
      command: 'SELECT',
    });
  });

  it('public request defaults to active promotions', async () => {
    authenticateUserMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/promotions',
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(queryMock.mock.calls[0]?.[1]).toContain('active');
  });

  it('public request for draft promotions returns 403', async () => {
    authenticateUserMock.mockResolvedValueOnce(null);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/promotions?status=draft',
      })
    );

    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('vendor can list own draft promotions without placeId', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'vendor-1', role: 'vendor', email: 'vendor@example.com' },
      placeIds: ['place-1', 'place-2'],
    });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/promotions?status=draft',
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(queryMock.mock.calls[0]?.[0]).toContain('pl.owner_id');
    expect(queryMock.mock.calls[0]?.[1]).toContain('vendor-1');
    expect(queryMock.mock.calls[0]?.[1]).toContain('draft');
  });

  it('vendor requesting non-owned place draft promotions returns 403', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'vendor-1', role: 'vendor', email: 'vendor@example.com' },
      placeIds: ['place-1'],
    });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/promotions?placeId=place-2&status=scheduled',
      })
    );

    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('admin can request non-public statuses', async () => {
    authenticateUserMock.mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'admin', email: 'admin@example.com' },
      placeIds: [],
    });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/promotions?status=scheduled&placeId=place-9',
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(queryMock.mock.calls[0]?.[1]).toContain('place-9');
    expect(queryMock.mock.calls[0]?.[1]).toContain('scheduled');
  });
});
