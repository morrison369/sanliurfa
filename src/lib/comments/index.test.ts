import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createComment,
  getComments,
  getCommentById,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentThread,
  flattenComments,
} from './index';

vi.mock('../postgres');

import { query } from '../postgres';

describe('Comment System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a root comment', async () => {
      const mockComment = {
        id: 1,
        content: 'Test comment',
        user_id: 'user1',
        user_name: 'Test User',
        entity_type: 'place',
        entity_id: 'place1',
        depth: 0,
        parent_id: null,
        likes: 0,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({ rows: [mockComment] } as any);

      const result = await createComment({
        content: 'Test comment',
        userId: 'user1',
        entityType: 'place',
        entityId: 'place1',
      });

      expect(result.content).toBe('Test comment');
      expect(result.depth).toBe(0);
    });

    it('should create a reply comment', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ depth: 0 }] } as any) // Parent depth
        .mockResolvedValueOnce({ rows: [{ full_name: 'Test User' }] } as any) // User info
        .mockResolvedValueOnce({
          rows: [{
            id: 2, content: 'Reply', user_id: 'user1', user_name: 'Test User',
            entity_type: 'place', entity_id: 'place1', depth: 1, parent_id: '1',
            likes: 0, status: 'active', created_at: new Date(), updated_at: new Date(),
          }]
        } as any);

      const result = await createComment({
        content: 'Reply',
        userId: 'user1',
        entityType: 'place',
        entityId: 'place1',
        parentId: '1',
      });

      expect(result.depth).toBe(1);
    });

    it('should reject short comments', async () => {
      await expect(createComment({
        content: 'A',
        userId: 'user1',
        entityType: 'place',
        entityId: 'place1',
      })).rejects.toThrow();
    });
  });

  describe('getComments', () => {
    it('should return comments with total', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1, content: 'Test', user_id: 'user1', user_name: 'User',
            entity_type: 'place', entity_id: 'place1', depth: 0,
            likes: 0, status: 'active', created_at: new Date(), updated_at: new Date(),
          }]
        } as any);

      const result = await getComments('place', 'place1');

      expect(result.total).toBe(5);
      expect(result.comments).toHaveLength(1);
    });
  });

  describe('likeComment', () => {
    it('should increment likes', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);

      await likeComment('1', 'user1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comment_likes'),
        expect.any(Array)
      );
    });
  });

  describe('flattenComments', () => {
    it('should flatten nested comments', () => {
      const comments = [
        {
          id: '1',
          content: 'Root',
          replies: [
            { id: '2', content: 'Reply 1', replies: [] },
            { id: '3', content: 'Reply 2', replies: [] },
          ],
        },
      ] as any;

      const flat = flattenComments(comments);

      expect(flat).toHaveLength(3);
      expect(flat[0].id).toBe('1');
      expect(flat[1].id).toBe('2');
      expect(flat[2].id).toBe('3');
    });
  });
});
