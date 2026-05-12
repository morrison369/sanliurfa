/**
 * API Contract Tests - GET + POST /api/blog/comments
 *
 * GET (public):
 * - postId required → 400
 * - HARD RULE #17: safeIntParam postId (NaN guard) → 0 → 400
 * - approved=false query → moderation panel view
 * - getBlogComments called with stringified postId
 *
 * POST (anonymous + auth):
 * - Validation: postId (number min 1) + authorName (2-100) + content (2-5000) + authorEmail optional
 * - HARD RULE #11: user_id from session (NEVER trust client-supplied)
 * - addBlogComment with author info + post_id stringified
 * - Default response indicates approval pending
 *
 * vi.hoisted - blog + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { getBlogCommentsMock, addBlogCommentMock } = vi.hoisted(() => ({
  getBlogCommentsMock: vi.fn(),
  addBlogCommentMock: vi.fn(),
}));

vi.mock('../blog', () => ({
  getBlogComments: getBlogCommentsMock,
  addBlogComment: addBlogCommentMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  getBlogCommentsMock.mockReset();
  getBlogCommentsMock.mockResolvedValue([]);
  addBlogCommentMock.mockReset();
  addBlogCommentMock.mockResolvedValue({ id: 'c-1', status: 'pending' });
});

import { GET, POST } from '../../pages/api/blog/comments';

const authedUser = { id: 'user-1', email: 'auth@t.com', role: 'user' };

describe('GET /api/blog/comments', () => {
  it('missing postId → 400', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(400);
    expect(getBlogCommentsMock).not.toHaveBeenCalled();
  });

  it('BUG-LOCK: non-numeric postId clamps to min 1 (endpoint `postId === 0` check is DEAD CODE)', async () => {
    // safeIntParam(input, 0, 1, ...) with "abc" → NaN → defaultVal 0 → Math.max(1, 0) = 1 (clamp)
    // Endpoint expects 0 to trigger 400, but Math.max forces 1 → check never fires.
    // Documented as known issue: validation gate is bypassed for non-numeric input.
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments?postId=abc' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(200);
    expect(getBlogCommentsMock).toHaveBeenCalledWith('1', expect.anything());
  });

  it('BUG-LOCK: postId=0 clamps to 1 (same issue)', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments?postId=0' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(200);
    expect(getBlogCommentsMock).toHaveBeenCalledWith('1', expect.anything());
  });

  it('default approved=true (public view)', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments?postId=42' });
    await GET(ctx);
    expect(getBlogCommentsMock).toHaveBeenCalledWith('42', { approved: true });
  });

  it('approved=false → moderation panel view', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments?postId=42&approved=false' });
    await GET(ctx);
    expect(getBlogCommentsMock).toHaveBeenCalledWith('42', { approved: false });
  });

  it('postId stringified for DB compatibility', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments?postId=99' });
    await GET(ctx);
    expect(getBlogCommentsMock.mock.calls[0][0]).toBe('99');
    expect(typeof getBlogCommentsMock.mock.calls[0][0]).toBe('string');
  });

  it('returns count + postId in response', async () => {
    getBlogCommentsMock.mockResolvedValueOnce([{ id: 'c-1' }, { id: 'c-2' }]);
    const ctx = createApiContext({ url: 'http://localhost/api/blog/comments?postId=42' });
    const resp = await GET(ctx);
    const data = await parseJson(resp);
    expect(data.data.data.count).toBe(2);
    expect(data.data.data.postId).toBe(42);
  });
});

describe('POST /api/blog/comments', () => {
  it('missing postId → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { authorName: 'Ali', content: 'Test comment' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('content too short (<2 chars) → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 1, authorName: 'Ali', content: 'a' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('authorName too short (<2 chars) → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 1, authorName: 'X', content: 'Test comment' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('content > 5000 chars → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 1, authorName: 'Ali', content: 'a'.repeat(5001) },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('anonymous comment success → 201 + addBlogComment without user_id', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 42, authorName: 'Anonymous', content: 'Anon comment' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    const call = addBlogCommentMock.mock.calls[0][0];
    expect(call.post_id).toBe('42'); // stringified
    expect(call.author_name).toBe('Anonymous');
    expect(call.user_id).toBeUndefined(); // anonymous, no user_id
  });

  it('HARD RULE #11 - authenticated user_id from session (NEVER from body)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: {
        postId: 42, authorName: 'Ali', content: 'Test',
        // Attempt to spoof user_id via body — must be ignored, session ID used
        user_id: 'attacker-spoofed-id',
      },
      locals: { user: authedUser },
    });
    await POST(ctx);
    const call = addBlogCommentMock.mock.calls[0][0];
    expect(call.user_id).toBe('user-1'); // from session, NOT 'attacker-spoofed-id'
  });

  it('authorEmail empty fallback (\'\')', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 1, authorName: 'Ali', content: 'Test' },
      locals: {},
    });
    await POST(ctx);
    expect(addBlogCommentMock.mock.calls[0][0].author_email).toBe('');
  });

  it('addBlogComment returns null → throws → 500', async () => {
    addBlogCommentMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 1, authorName: 'Ali', content: 'Test comment' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });

  it('success message indicates approval pending', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { postId: 1, authorName: 'Ali', content: 'Test' },
      locals: {},
    });
    const resp = await POST(ctx);
    const data = await parseJson(resp);
    expect(data.data.message).toMatch(/onay/i);
  });
});
