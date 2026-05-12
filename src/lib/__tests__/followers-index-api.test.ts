/**
 * API Contract Tests - GET + POST + DELETE /api/followers
 *
 * GET:
 * - Missing userId → 422
 * - type allowlist (followers / following / mutual) → 422 if invalid
 * - safeIntParam limit 1..100 default 50 (HARD RULE #17)
 * - Helper dispatch: followers / following / mutual → different fn
 *
 * POST:
 * - Auth required → 401
 * - Missing target userId → 422
 * - followUser helper called → 201
 *
 * DELETE:
 * - Auth required → 401
 * - Missing target userId → 422
 * - unfollowUser helper called → 200
 *
 * vi.hoisted - followers helpers + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext } from './helpers/api-test-helpers';

const {
  getFollowersMock, getFollowingMock, getMutualFriendsMock,
  followUserMock, unfollowUserMock,
} = vi.hoisted(() => ({
  getFollowersMock: vi.fn(),
  getFollowingMock: vi.fn(),
  getMutualFriendsMock: vi.fn(),
  followUserMock: vi.fn(),
  unfollowUserMock: vi.fn(),
}));

vi.mock('../followers/followers', () => ({
  getFollowers: getFollowersMock,
  getFollowing: getFollowingMock,
  getMutualFriends: getMutualFriendsMock,
  followUser: followUserMock,
  unfollowUser: unfollowUserMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  getFollowersMock.mockReset();
  getFollowersMock.mockResolvedValue([]);
  getFollowingMock.mockReset();
  getFollowingMock.mockResolvedValue([]);
  getMutualFriendsMock.mockReset();
  getMutualFriendsMock.mockResolvedValue([]);
  followUserMock.mockReset();
  followUserMock.mockResolvedValue(undefined);
  unfollowUserMock.mockReset();
  unfollowUserMock.mockResolvedValue(undefined);
});

import { GET, POST, DELETE } from '../../pages/api/followers';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

describe('GET /api/followers', () => {
  it('missing userId → 422', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?type=followers' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
    expect(getFollowersMock).not.toHaveBeenCalled();
  });

  it('invalid type (not in allowlist) → 422', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?userId=u-2&type=stalkers' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
  });

  it('default type "followers" + default limit 50', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?userId=u-2' });
    await GET(ctx);
    expect(getFollowersMock).toHaveBeenCalledWith('u-2', 50);
  });

  it('type=following dispatches getFollowing', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?userId=u-2&type=following' });
    await GET(ctx);
    expect(getFollowingMock).toHaveBeenCalledWith('u-2', 50);
    expect(getFollowersMock).not.toHaveBeenCalled();
  });

  it('type=mutual dispatches getMutualFriends', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?userId=u-2&type=mutual' });
    await GET(ctx);
    expect(getMutualFriendsMock).toHaveBeenCalledWith('u-2', 50);
  });

  it('safeIntParam clamps limit to max 100 (HARD RULE #17)', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?userId=u-2&limit=999' });
    await GET(ctx);
    expect(getFollowersMock.mock.calls[0][1]).toBe(100);
  });

  it('safeIntParam non-numeric → fallback default 50', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/followers?userId=u-2&limit=abc' });
    await GET(ctx);
    expect(getFollowersMock.mock.calls[0][1]).toBe(50);
  });
});

describe('POST /api/followers', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { userId: 'u-2' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(followUserMock).not.toHaveBeenCalled();
  });

  it('missing userId → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: {},
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('valid - followUser called with (followerId, targetUserId) → 201', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { userId: 'u-target' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(followUserMock).toHaveBeenCalledWith('user-1', 'u-target');
  });

  it('helper throws → 500', async () => {
    followUserMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx = createApiContext({
      method: 'POST',
      body: { userId: 'u-target' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });
});

describe('DELETE /api/followers', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: { userId: 'u-2' },
      locals: {},
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(401);
  });

  it('missing userId → 422', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: {},
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(422);
  });

  it('valid - unfollowUser called → 200', async () => {
    const ctx = createApiContext({
      method: 'DELETE',
      body: { userId: 'u-target' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(200);
    expect(unfollowUserMock).toHaveBeenCalledWith('user-1', 'u-target');
  });

  it('helper throws → 500', async () => {
    unfollowUserMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx = createApiContext({
      method: 'DELETE',
      body: { userId: 'u-target' },
      locals: { user: authedUser },
    });
    const resp = await DELETE(ctx);
    expect(resp.status).toBe(500);
  });
});
