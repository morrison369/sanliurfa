import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryOneMock, getPlaceVerificationMock, loggerErrorMock, loggerSetRequestIdMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  getPlaceVerificationMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({ queryOne: queryOneMock }));
vi.mock('../place/place-verification', () => ({
  getPlaceVerification: getPlaceVerificationMock,
}));
vi.mock('../metrics', () => ({ recordRequest: vi.fn() }));
vi.mock('../logging', () => ({
  logger: { setRequestId: loggerSetRequestIdMock, error: loggerErrorMock },
}));

import { GET } from '../../pages/api/places/[id]/verification';

describe('places verification api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when place does not exist', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/verification',
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(404);
  });

  it('returns verification data on success', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    getPlaceVerificationMock.mockResolvedValueOnce({ status: 'pending' });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/verification',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.verification?.status).toBe('pending');
  });
});
