import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  queryManyMock,
  getCacheMock,
  setCacheMock,
  recordRequestMock,
  loggerSetRequestIdMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  queryManyMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  recordRequestMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
  },
}));

import { GET } from '../../pages/api/users/suggestions';

describe('users suggestions api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/users/suggestions?limit=5',
        locals: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body?.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns cached suggestions without hitting database', async () => {
    getCacheMock.mockResolvedValueOnce(
      JSON.stringify({
        success: true,
        suggestions: [{ id: 'cached-user', username: 'cached' }],
        count: 1,
      })
    );

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/users/suggestions?limit=5',
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(queryManyMock).not.toHaveBeenCalled();
    expect(body?.data?.suggestions?.[0]?.id).toBe('cached-user');
  });

  it('uses parameterized excluded id list in additional users query', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    queryManyMock
      .mockResolvedValueOnce([{ category: 'restoran' }])
      .mockResolvedValueOnce([
        {
          id: 'user-a',
          full_name: 'User A',
          username: 'usera',
          avatar_url: null,
          is_following: 0,
          activity_count: 5,
          matching_interests: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'user-b',
          full_name: 'User B',
          username: 'userb',
          avatar_url: null,
          is_following: 0,
          activity_count: 3,
        },
      ]);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/users/suggestions?limit=3',
        locals: { user: { id: 'u-main' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);

    const additionalCall = queryManyMock.mock.calls[2];
    expect(additionalCall).toBeDefined();

    const [sql, params] = additionalCall;
    expect(String(sql)).toContain('NOT (u.id = ANY($2::uuid[]))');
    expect(params[0]).toBe('u-main');
    expect(params[1]).toEqual(['user-a']);
    expect(typeof params[2]).toBe('number');
    expect(setCacheMock).toHaveBeenCalled();
  });
});

