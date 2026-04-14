/**
 * Nested Comment System
 * Hierarchical comments with replies
 */

import { query } from '../postgres';

export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  parentId?: string;
  entityType: 'place' | 'blog' | 'review' | 'event';
  entityId: string;
  depth: number;
  likes: number;
  isEdited: boolean;
  status: 'active' | 'deleted' | 'flagged';
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
  replyCount?: number;
}

export interface CreateCommentInput {
  content: string;
  userId: string;
  entityType: Comment['entityType'];
  entityId: string;
  parentId?: string;
}

const MAX_DEPTH = 5;
const MAX_LENGTH = 2000;

function newError(msg: string): Error {
  return new Error(msg);
}

function mapCommentRow(row: any): Comment {
  return {
    id: row.id,
    content: row.content,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    parentId: row.parent_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    depth: row.depth,
    likes: row.likes,
    isEdited: row.is_edited,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  if (!input.content || input.content.trim().length < 2) {
    throw new Error('Comment must be at least 2 characters');
  }
  if (input.content.length > MAX_LENGTH) {
    throw new Error(`Comment must be at most ${MAX_LENGTH} characters`);
  }

  let depth = 0;
  if (input.parentId) {
    const parentResult = await query('SELECT depth FROM comments WHERE id = $1', [input.parentId]);
    if (parentResult.rows.length === 0) {
      throw new Error('Parent comment not found');
    }
    depth = parentResult.rows[0].depth + 1;
    if (depth > MAX_DEPTH) {
      throw newError('Maximum reply depth reached');
    }
  }

  const userResult = await query('SELECT full_name, avatar_url FROM users WHERE id = $1', [input.userId]);
  const userName = userResult.rows[0]?.full_name || 'Anonymous';
  const userAvatar = userResult.rows[0]?.avatar_url;

  const result = await query(
    `INSERT INTO comments (content, user_id, user_name, user_avatar, parent_id, entity_type, entity_id, depth, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())
     RETURNING *`,
    [input.content, input.userId, userName, userAvatar, input.parentId, input.entityType, input.entityId, depth]
  );

  return mapCommentRow(result.rows[0]);
}

export async function getComments(
  entityType: Comment['entityType'],
  entityId: string,
  options: { sortBy?: 'newest' | 'oldest' | 'popular'; limit?: number; offset?: number; includeReplies?: boolean } = {}
): Promise<{ comments: Comment[]; total: number }> {
  const { sortBy = 'newest', limit = 20, offset = 0, includeReplies = true } = options;

  const countResult = await query(
    `SELECT COUNT(*) FROM comments WHERE entity_type = $1 AND entity_id = $2 AND status = 'active'`,
    [entityType, entityId]
  );
  const total = parseInt(countResult.rows[0].count);

  let orderBy = 'created_at DESC';
  if (sortBy === 'oldest') orderBy = 'created_at ASC';
  if (sortBy === 'popular') orderBy = 'likes DESC, created_at DESC';

  const result = await query(
    `SELECT * FROM comments WHERE entity_type = $1 AND entity_id = $2 AND status = 'active' AND parent_id IS NULL
     ORDER BY ${orderBy} LIMIT $3 OFFSET $4`,
    [entityType, entityId, limit, offset]
  );

  let comments = result.rows.map(mapCommentRow);

  if (includeReplies) {
    comments = await loadReplies(comments);
  } else {
    for (const comment of comments) {
      comment.replyCount = await getReplyCount(comment.id);
    }
  }

  return { comments, total };
}

async function loadReplies(comments: Comment[], maxDepth = MAX_DEPTH): Promise<Comment[]> {
  if (comments.length === 0) return comments;

  const commentIds = comments.map(c => c.id);
  const result = await query(
    `SELECT * FROM comments WHERE parent_id = ANY($1) AND status = 'active' ORDER BY created_at ASC`,
    [commentIds]
  );

  const repliesByParent: Record<string, Comment[]> = {};
  for (const row of result.rows) {
    const reply = mapCommentRow(row);
    if (!repliesByParent[row.parent_id]) {
      repliesByParent[row.parent_id] = [];
    }
    repliesByParent[row.parent_id].push(reply);
  }

  for (const comment of comments) {
    if (repliesByParent[comment.id]) {
      comment.replies = repliesByParent[comment.id];
      if (comment.depth < maxDepth - 1) {
        comment.replies = await loadReplies(comment.replies, maxDepth);
      }
    }
  }

  return comments;
}

async function getReplyCount(commentId: string): Promise<number> {
  const result = await query(`SELECT COUNT(*) FROM comments WHERE parent_id = $1 AND status = 'active'`, [commentId]);
  return parseInt(result.rows[0].count);
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const result = await query('SELECT * FROM comments WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return mapCommentRow(result.rows[0]);
}

export async function updateComment(id: string, userId: string, content: string): Promise<Comment> {
  if (!content || content.trim().length < 2) {
    throw new Error('Comment must be at least 2 characters');
  }

  const result = await query(
    `UPDATE comments SET content = $1, is_edited = true, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 AND status = 'active' RETURNING *`,
    [content, id, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Comment not found or no permission');
  }

  return mapCommentRow(result.rows[0]);
}

export async function deleteComment(id: string, userId: string, isAdmin = false): Promise<void> {
  const whereClause = isAdmin ? 'id = $1' : 'id = $1 AND user_id = $2';
  const params = isAdmin ? [id] : [id, userId];

  await query(
    `UPDATE comments SET status = 'deleted', content = '[deleted]', updated_at = NOW() WHERE ${whereClause}`,
    params
  );
}

export async function likeComment(commentId: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES ($1, $2, NOW())
     ON CONFLICT (comment_id, user_id) DO NOTHING`,
    [commentId, userId]
  );

  await query(`UPDATE comments SET likes = likes + 1 WHERE id = $1`, [commentId]);
}

export async function unlikeComment(commentId: string, userId: string): Promise<void> {
  const result = await query(
    `DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2 RETURNING *`,
    [commentId, userId]
  );

  if (result.rows.length > 0) {
    await query(`UPDATE comments SET likes = GREATEST(0, likes - 1) WHERE id = $1`, [commentId]);
  }
}

export async function hasUserLiked(commentId: string, userId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
    [commentId, userId]
  );
  return result.rows.length > 0;
}

export async function getCommentThread(commentId: string): Promise<Comment[]> {
  const comment = await getCommentById(commentId);
  if (!comment) return [];

  const ancestors: Comment[] = [];
  let current = comment;

  while (current.parentId) {
    const parent = await getCommentById(current.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  return [...ancestors, comment];
}

export function flattenComments(comments: Comment[]): Comment[] {
  const flat: Comment[] = [];
  
  function addComment(c: Comment) {
    flat.push(c);
    if (c.replies) {
      c.replies.forEach(addComment);
    }
  }
  
  comments.forEach(addComment);
  return flat;
}
