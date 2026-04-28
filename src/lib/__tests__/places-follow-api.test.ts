import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson, expectApiErrorCode } from './helpers/api-test-helpers';

const {
  queryOneMock,
  isFollowingPlaceMock,
  followPlaceMock,
  unfollowPlaceMock,
  loggerErrorMock,
  loggerSetRequestIdMock,
} = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  isFollowingPlaceMock: vi.fn(),
  followPlaceMock: vi.fn(),
  unfollowPlaceMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerSetRequestIdMock: vi.fn(),
}));

vi.mock('../postgres', () => ({ queryOne: queryOneMock }));
vi.mock('../place/place-followers', () => ({
  followPlace: followPlaceMock,
  unfollowPlace: unfollowPlaceMock,
  isFollowingPlace: isFollowingPlaceMock,
}));
vi.mock('../metrics', () => ({ recordRequest: vi.fn() }));
vi.mock('../logging', () => ({
  logger: { setRequestId: loggerSetRequestIdMock, error: loggerErrorMock },
}));

import { DELETE, POST } from '../../pages/api/places/[id]/follow';

describe('places follow api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST returns 401 when unauthenticated', async () => {
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/follow',
        method: 'POST',
        locals: {},
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(401);
  });

  it('POST returns 409 when already following', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    isFollowingPlaceMock.mockResolvedValueOnce(true);
    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/follow',
        method: 'POST',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(409);
  });

  it('POST returns 404 when place does not exist', async () => {
    queryOneMock.mockResolvedValueOnce(null);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/follow',
        method: 'POST',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('POST returns 201 on successful follow', async () => {
    queryOneMock.mockResolvedValueOnce({ id: '1' });
    isFollowingPlaceMock.mockResolvedValueOnce(false);
    followPlaceMock.mockResolvedValueOnce(true);

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/places/1/follow',
        method: 'POST',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(201);
    expect(body?.data?.success).toBe(true);
  });

  it('DELETE returns 200 on successful unfollow', async () => {
    isFollowingPlaceMock.mockResolvedValueOnce(true);
    unfollowPlaceMock.mockResolvedValueOnce(true);
    const response = await DELETE(
      createApiContext({
        url: 'http://localhost/api/places/1/follow',
        method: 'DELETE',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    expect(response.status).toBe(200);
  });

  it('DELETE returns 404 when user is not following place', async () => {
    isFollowingPlaceMock.mockResolvedValueOnce(false);

    const response = await DELETE(
      createApiContext({
        url: 'http://localhost/api/places/1/follow',
        method: 'DELETE',
        locals: { user: { id: 'u1' } },
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });
});
