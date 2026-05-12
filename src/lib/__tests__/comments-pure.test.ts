/**
 * Unit Tests - comment/comments.ts vi.mock postgres+cache
 *
 * - createComment (insert + cache invalidate + user info join)
 * - user_name fallback "Anonim" when full_name missing
 * - parent_comment_id null default
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, insertMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  insertMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: vi.fn(),
  insert: insertMock,
}));

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue('OK'),
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  insertMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { createComment } from '../comment/comments';

describe('createComment', () => {
  it('insert + user lookup + Comment shape', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'comment-1',
      user_id: 'u-1',
      target_type: 'place',
      target_id: 'place-1',
      parent_comment_id: null,
      content: 'Great place!',
      created_at: '2026-05-05',
      updated_at: '2026-05-05',
    });
    queryOneMock.mockResolvedValueOnce({ full_name: 'Ali Yılmaz', avatar: '/avatar.jpg' });

    const r = await createComment('u-1', 'place', 'place-1', 'Great place!');
    expect(r.id).toBe('comment-1');
    expect(r.user_name).toBe('Ali Yılmaz');
    expect(r.user_avatar).toBe('/avatar.jpg');
    expect(r.helpful_count).toBe(0);
    expect(r.unhelpful_count).toBe(0);
  });

  it('user not found - "Anonim" fallback', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'c-1',
      user_id: 'u-1',
      target_type: 'place',
      target_id: 'place-1',
      content: 'X',
      created_at: 't',
      updated_at: 't',
    });
    queryOneMock.mockResolvedValueOnce(null);

    const r = await createComment('u-1', 'place', 'place-1', 'X');
    expect(r.user_name).toBe('Anonim');
    expect(r.user_avatar).toBeUndefined();
  });

  it('parent_comment_id - threaded reply', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'reply-1',
      user_id: 'u-1',
      target_type: 'place',
      target_id: 'place-1',
      parent_comment_id: 'parent-1',
      content: 'Reply',
      created_at: 't',
      updated_at: 't',
    });
    queryOneMock.mockResolvedValueOnce({ full_name: 'Ali' });

    const r = await createComment('u-1', 'place', 'place-1', 'Reply', 'parent-1');
    expect(r.parent_comment_id).toBe('parent-1');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].parent_comment_id).toBe('parent-1');
  });

  it('parent_comment_id default null', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'c-1',
      user_id: 'u-1',
      target_type: 'place',
      target_id: 'place-1',
      parent_comment_id: null,
      content: 'X',
      created_at: 't',
      updated_at: 't',
    });
    queryOneMock.mockResolvedValueOnce({ full_name: 'Ali' });

    await createComment('u-1', 'place', 'place-1', 'X');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].parent_comment_id).toBeNull();
  });

  it('cache invalidate - "comments:{targetType}:{targetId}"', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'c-1', user_id: 'u-1', target_type: 'review', target_id: 'r-1',
      content: 'X', created_at: 't', updated_at: 't',
    });
    queryOneMock.mockResolvedValueOnce({ full_name: 'Ali' });

    await createComment('u-1', 'review', 'r-1', 'X');
    expect(deleteCacheMock).toHaveBeenCalledWith('comments:review:r-1');
  });

  it('exception - throw', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(createComment('u-1', 'place', 'p-1', 'X')).rejects.toThrow();
  });

  it('initial counts - helpful_count + unhelpful_count 0 + user_vote null', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'c-1', user_id: 'u-1', target_type: 'place', target_id: 'p-1',
      content: 'X', created_at: 't', updated_at: 't',
    });
    queryOneMock.mockResolvedValueOnce({ full_name: 'Ali' });

    const r = await createComment('u-1', 'place', 'p-1', 'X');
    expect(r.helpful_count).toBe(0);
    expect(r.unhelpful_count).toBe(0);
    expect(r.user_vote).toBeNull();
  });
});
