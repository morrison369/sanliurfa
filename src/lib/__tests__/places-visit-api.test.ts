import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, recordPlaceVisitMock, loggerErrorMock, loggerSetRequestIdMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  recordPlaceVisitMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../place/place-visits', () => ({
  recordPlaceVisit: recordPlaceVisitMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
  },
}));

import { POST } from '../../pages/api/places/[id]/visit';

describe('places visit api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/visit',
        method: 'POST',
        body: {},
        params: { id: '1' },
        locals: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expectApiErrorCode(body, 'UNAUTHORIZED');
  });

  it('returns 404 when place does not exist', async () => {
    queryOneMock.mockResolvedValueOnce(null);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/visit',
        method: 'POST',
        body: {},
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('returns 201 when visit is recorded', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    recordPlaceVisitMock.mockResolvedValueOnce({ id: 'v1' });

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/visit',
        method: 'POST',
        body: { rating: 4, notes: 'Guzeldi' },
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(201);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.visit?.id).toBe('v1');
  });
});
