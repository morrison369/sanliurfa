/**
 * Comments System
 * Threaded comments with helpful/unhelpful voting
 */

import { query, queryOne, queryRows, insert } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  target_type: string;
  target_id: string;
  parent_comment_id?: string;
  content: string;
  helpful_count: number;
  unhelpful_count: number;
  user_vote?: 'helpful' | 'unhelpful' | null;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

/**
 * Create a comment
 */
export async function createComment(
  userId: string,
  targetType: string,
  targetId: string,
  content: string,
  parentCommentId?: string
): Promise<Comment> {
  try {
    const comment = await insert('comments', {
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      parent_comment_id: parentCommentId || null,
      content: content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Clear cache
    await deleteCache(`sanliurfa:comments:${targetType}:${targetId}`);

    // Get user info
    const user = await queryOne('SELECT full_name, avatar FROM users WHERE id = $1', [userId]);

    return {
      id: comment.id,
      user_id: comment.user_id,
      user_name: user?.full_name || 'Anonim',
      user_avatar: user?.avatar,
      target_type: comment.target_type,
      target_id: comment.target_id,
      parent_comment_id: comment.parent_comment_id,
      content: comment.content,
      helpful_count: 0,
      unhelpful_count: 0,
      user_vote: null,
      created_at: comment.created_at,
      updated_at: comment.updated_at
    };
  } catch (error) {
    logger.error('Failed to create comment', error instanceof Error ? error : new Error(String(error)), {
      userId,
      targetType,
      targetId
    });
    throw error;
  }
}

/**
 * Get comments for a target
 */
export async function getComments(
  targetType: string,
  targetId: string,
  userId?: string,
  limit: number = 50
): Promise<Comment[]> {
  const cacheKey = `sanliurfa:comments:${targetType}:${targetId}:${limit}`;

  try {
    // Try cache first
    const cached = await getCache<Comment[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await queryRows(
      `SELECT
        c.id,
        c.user_id,
        u.full_name as user_name,
        u.avatar as user_avatar,
        c.target_type,
        c.target_id,
        c.parent_comment_id,
        c.content,
        c.helpful_count,
        c.unhelpful_count,
        (SELECT vote_type FROM comment_votes
         WHERE comment_id = c.id AND user_id = $3
         LIMIT 1) as user_vote,
        c.created_at,
        c.updated_at
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.target_type = $1
         AND c.target_id = $2
         AND c.deleted_at IS NULL
         AND c.parent_comment_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT $4`,
      [targetType, targetId, userId || 'NULL', limit]
    );

    const comments: Comment[] = results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
      target_type: row.target_type,
      target_id: row.target_id,
      parent_comment_id: row.parent_comment_id,
      content: row.content,
      helpful_count: row.helpful_count || 0,
      unhelpful_count: row.unhelpful_count || 0,
      user_vote: row.user_vote as 'helpful' | 'unhelpful' | null,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, comments, 300);

    return comments;
  } catch (error) {
    logger.error('Failed to get comments', error instanceof Error ? error : new Error(String(error)), {
      targetType,
      targetId
    });
    throw error;
  }
}

/**
 * Vote on a comment (helpful/unhelpful)
 */
export async function voteOnComment(
  commentId: string,
  userId: string,
  voteType: 'helpful' | 'unhelpful'
): Promise<void> {
  try {
    // Get comment to find target for cache clearing
    const comment = await queryOne('SELECT target_type, target_id FROM comments WHERE id = $1', [commentId]);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Insert or update vote
    const result = await insert('comment_votes', {
      comment_id: commentId,
      user_id: userId,
      vote_type: voteType,
      created_at: new Date().toISOString()
    });

    if (result) {
      // Update comment helpful/unhelpful count
      const columnName = voteType === 'helpful' ? 'helpful_count' : 'unhelpful_count';
      await query(
        `UPDATE comments SET ${columnName} = ${columnName} + 1 WHERE id = $1`,
        [commentId]
      );

      // Clear cache
      await deleteCache(`sanliurfa:comments:${comment.target_type}:${comment.target_id}`);
    }
  } catch (error) {
    // Duplicate vote - ignore (user already voted)
    if (error instanceof Error && error.message.includes('duplicate')) {
      return;
    }
    logger.error('Failed to vote on comment', error instanceof Error ? error : new Error(String(error)), {
      commentId,
      userId,
      voteType
    });
    throw error;
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<Comment> {
  try {
    // Verify ownership
    const comment = await queryOne('SELECT * FROM comments WHERE id = $1', [commentId]);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.user_id !== userId) {
      throw new Error('Not authorized');
    }

    await query(
      'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2',
      [content, commentId]
    );

    // Clear cache
    await deleteCache(`sanliurfa:comments:${comment.target_type}:${comment.target_id}`);

    const user = await queryOne('SELECT full_name, avatar FROM users WHERE id = $1', [userId]);

    return {
      id: comment.id,
      user_id: comment.user_id,
      user_name: user?.full_name || 'Anonim',
      user_avatar: user?.avatar,
      target_type: comment.target_type,
      target_id: comment.target_id,
      parent_comment_id: comment.parent_comment_id,
      content: content,
      helpful_count: comment.helpful_count || 0,
      unhelpful_count: comment.unhelpful_count || 0,
      user_vote: null,
      created_at: comment.created_at,
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to update comment', error instanceof Error ? error : new Error(String(error)), {
      commentId,
      userId
    });
    throw error;
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  try {
    // Verify ownership
    const comment = await queryOne('SELECT * FROM comments WHERE id = $1', [commentId]);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.user_id !== userId) {
      throw new Error('Not authorized');
    }

    // Soft delete
    await query('UPDATE comments SET deleted_at = NOW() WHERE id = $1', [commentId]);

    // Clear cache
    await deleteCache(`sanliurfa:comments:${comment.target_type}:${comment.target_id}`);
  } catch (error) {
    logger.error('Failed to delete comment', error instanceof Error ? error : new Error(String(error)), {
      commentId,
      userId
    });
    throw error;
  }
}
