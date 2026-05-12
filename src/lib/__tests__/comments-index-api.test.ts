/**
 * API Contract Tests - GET + POST /api/comments
 *
 * GET:
 * - targetType + targetId required → 422
 * - targetType allowlist (place/review/blog/event/recipe) → 400 if invalid
 * - safeIntParam limit 1..100 default 50 (HARD RULE #17 NaN guard)
 * - getComments helper called + returned data
 *
 * POST:
 * - Auth required → 401
 * - Validation: targetType / targetId / content (1-5000 sanitize) required
 * - parentCommentId optional (reply chain)
 * - createComment helper called + 201
 *
 * vi.hoisted - comment helpers + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { getCommentsMock, createCommentMock } = vi.hoisted(() => ({
  getCommentsMock: vi.fn(),
  createCommentMock: vi.fn(),
}));

vi.mock('../comment/comments', () => ({
  getComments: getCommentsMock,
  createComment: createCommentMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  getCommentsMock.mockReset();
  getCommentsMock.mockResolvedValue([]);
  createCommentMock.mockReset();
  createCommentMock.mockResolvedValue({ id: 'comment-1' });
});

import { GET, POST } from '../../pages/api/comments';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

describe('GET /api/comments', () => {
  it('missing targetType → 422', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetId=p-1',
      locals: {},
    });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
  });

  it('missing targetId → 422', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetType=place',
      locals: {},
    });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
  });

  it('invalid targetType (not in allowlist) → 400', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetType=evil&targetId=x',
      locals: {},
    });
    const resp = await GET(ctx);
    expect(resp.status).toBe(400);
    expect(getCommentsMock).not.toHaveBeenCalled();
  });

  it('valid - getComments called with default limit 50 (HARD RULE #17)', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetType=place&targetId=p-1',
      locals: {},
    });
    const resp = await GET(ctx);
    expect(resp.status).toBe(200);
    expect(getCommentsMock).toHaveBeenCalledWith('place', 'p-1', undefined, 50);
  });

  it('safeIntParam clamps limit to max 100', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetType=place&targetId=p-1&limit=999',
      locals: {},
    });
    await GET(ctx);
    expect(getCommentsMock.mock.calls[0][3]).toBe(100);
  });

  it('safeIntParam falls back to default 50 for non-numeric', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetType=place&targetId=p-1&limit=abc',
      locals: {},
    });
    await GET(ctx);
    expect(getCommentsMock.mock.calls[0][3]).toBe(50);
  });

  it('valid auth - userId passed to helper for vote state', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/comments?targetType=blog&targetId=b-1',
      locals: { user: authedUser },
    });
    await GET(ctx);
    expect(getCommentsMock).toHaveBeenCalledWith('blog', 'b-1', 'user-1', 50);
  });

  it('all 5 valid targetTypes accepted', async () => {
    for (const tt of ['place', 'review', 'blog', 'event', 'recipe']) {
      const ctx = createApiContext({
        url: `http://localhost/api/comments?targetType=${tt}&targetId=x`,
        locals: {},
      });
      const resp = await GET(ctx);
      expect(resp.status).toBe(200);
    }
  });
});

describe('POST /api/comments', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { targetType: 'place', targetId: 'p-1', content: 'Test' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it('missing content → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { targetType: 'place', targetId: 'p-1' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('content > 5000 chars → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { targetType: 'place', targetId: 'p-1', content: 'a'.repeat(5001) },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('missing targetType → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { targetId: 'p-1', content: 'Test' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('valid - 201 + createComment called with userId/targetType/targetId/content', async () => {
    createCommentMock.mockResolvedValueOnce({ id: 'c-new', content: 'Test' });
    const ctx = createApiContext({
      method: 'POST',
      body: { targetType: 'place', targetId: 'p-1', content: 'Test comment' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(createCommentMock).toHaveBeenCalledWith(
      'user-1', 'place', 'p-1', 'Test comment', undefined
    );
  });

  it('parentCommentId passed to helper for reply chain', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { targetType: 'place', targetId: 'p-1', content: 'Reply', parentCommentId: 'c-parent' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    expect(createCommentMock).toHaveBeenCalledWith(
      'user-1', 'place', 'p-1', 'Reply', 'c-parent'
    );
  });

  it('createComment throws → 500', async () => {
    createCommentMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx = createApiContext({
      method: 'POST',
      body: { targetType: 'place', targetId: 'p-1', content: 'Test' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });
});
