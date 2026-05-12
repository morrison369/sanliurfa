import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, requestPlaceVerificationMock, loggerErrorMock, loggerSetRequestIdMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  requestPlaceVerificationMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({ queryOne: queryOneMock }));
vi.mock('../place/place-verification', () => ({
  requestPlaceVerification: requestPlaceVerificationMock,
}));
vi.mock('../metrics', () => ({ recordRequest: vi.fn() }));
vi.mock('../logging', () => ({
  logger: { setRequestId: loggerSetRequestIdMock, error: loggerErrorMock },
}));

import { POST } from '../../pages/api/places/[id]/request-verification';

describe('places request verification api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/request-verification',
        method: 'POST',
        body: {},
        locals: {},
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when place does not exist', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/request-verification',
        method: 'POST',
        body: {},
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(404);
  });

  it('returns 201 when verification request is created', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1', owner_id: 'u1' });
    requestPlaceVerificationMock.mockResolvedValueOnce({ id: 'vr1' });

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/request-verification',
        method: 'POST',
        body: { documents: [{ type: 'tax' }] },
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(201);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.verification?.id).toBe('vr1');
  });
});
