import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson, expectApiErrorCode } from './helpers/api-test-helpers';

const {
  sharePlaceMock,
  getShareCountMock,
  loggerErrorMock,
  loggerInfoMock,
  loggerSetRequestIdMock,
} = vi.hoisted(() => ({
  sharePlaceMock: vi.fn(),
  getShareCountMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../social/social-interactions', () => ({
  sharePlace: sharePlaceMock,
  getShareCount: getShareCountMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

vi.mock('../logging', () => ({
  logger: {
    setRequestId: loggerSetRequestIdMock,
    error: loggerErrorMock,
    info: loggerInfoMock,
  },
}));

import { GET, POST } from '../../pages/api/places/[id]/share';

describe('places share api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST returns 401 when unauthenticated', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/share',
        method: 'POST',
        body: { platform: 'twitter' },
        params: { id: '1' },
        locals: {},
      })
    );
    expect(response.status).toBe(401);
  });

  it('POST returns 201 and share count on success', async () => {
    sharePlaceMock.mockResolvedValueOnce('share-1');
    getShareCountMock.mockResolvedValueOnce(5);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/share',
        method: 'POST',
        body: { platform: 'twitter', share_url: 'https://x.com/test' },
        params: { id: '1' },
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(201);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.shareId).toBe('share-1');
    expect(body?.data?.data?.count).toBe(5);
  });

  it('POST returns 400 when place id is missing', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places//share',
        method: 'POST',
        body: { platform: 'twitter' },
        params: {},
        locals: { user: { id: 'u1' } },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });

  it('GET returns share count', async () => {
    getShareCountMock.mockResolvedValueOnce(12);

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/share',
        params: { id: '1' },
        locals: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success).toBe(true);
    expect(body?.data?.data?.count).toBe(12);
  });

  it('GET returns 400 when place id is missing', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places//share',
        params: {},
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });
});
