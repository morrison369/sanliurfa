/**
 * Direct Messaging System (PostgreSQL)
 * Real-time chat between users
 */

import { query, queryOne, transaction } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';
import { publishMessageEvent } from './message-events';

type TypingState = {
  userId: string;
  expiresAt: number;
};

const typingStateByConversation = new Map<string, Map<string, TypingState>>();
const TYPING_TTL_MS = 10000;

// Message types
export type MessageType = 'text' | 'image' | 'location' | 'place_share' | 'voice';

// Message
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  metadata?: {
    place_id?: string;
    place_name?: string;
    image_url?: string;
    latitude?: number;
    longitude?: number;
    duration?: number;
  };
  is_read: boolean;
  read_at?: string;
  edited_at?: string;
  created_at: string;
}

// Conversation
export interface Conversation {
  id: string;
  is_group: boolean;
  group_name?: string;
  group_avatar?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  unread_count?: number;
  participants?: ConversationParticipant[];
}

// Conversation participant
export interface ConversationParticipant {
  user_id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  joined_at: string;
  last_read_at?: string;
}

export interface ConversationReadReceipt {
  user_id: string;
  full_name: string;
  username?: string;
  last_read_at?: string;
}

// Conversation with other user info (for 1-on-1)
export interface ConversationWithUser extends Conversation {
  other_user: {
    id: string;
    full_name: string;
    username?: string;
    avatar_url?: string;
    is_online?: boolean;
  };
}

/**
 * Create or get 1-on-1 conversation
 */
export async function getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
  if (userId1 === userId2) {
    throw new Error('Cannot create conversation with yourself');
  }

  // Check if conversation exists
  const existing = await queryOne<Conversation>(
    `SELECT c.* FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
     WHERE c.is_group = false`,
    [userId1, userId2]
  );

  if (existing) {
    return existing;
  }

  // Create new conversation
  return await transaction(async (client) => {
    const convResult = await client.query<Conversation>(
      `INSERT INTO conversations (is_group, created_by)
       VALUES (false, $1)
       RETURNING *`,
      [userId1]
    );

    const conversation = convResult.rows[0];

    // Add participants
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [conversation.id, userId1, userId2]
    );

    return conversation;
  });
}

/**
 * Create group conversation
 */
export async function createGroupConversation(
  creatorId: string,
  name: string,
  participantIds: string[],
  avatarUrl?: string
): Promise<Conversation> {
  return await transaction(async (client) => {
    const convResult = await client.query<Conversation>(
      `INSERT INTO conversations (is_group, group_name, group_avatar, created_by)
       VALUES (true, $1, $2, $3)
       RETURNING *`,
      [name, avatarUrl, creatorId]
    );

    const conversation = convResult.rows[0];

    // Add all participants
    const allParticipants = [creatorId, ...participantIds];
    for (const userId of allParticipants) {
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2)`,
        [conversation.id, userId]
      );
    }

    return conversation;
  });
}

/**
 * Send message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType = 'text',
  metadata?: Message['metadata']
): Promise<Message> {
  // Verify sender is participant
  const isParticipant = await queryOne(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, senderId]
  );

  if (!isParticipant) {
    throw new Error('Not a participant in this conversation');
  }

  return await transaction(async (client) => {
    // Insert message
    const msgResult = await client.query<Message>(
      `INSERT INTO messages (conversation_id, sender_id, content, type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, senderId, content, type, metadata ? JSON.stringify(metadata) : null]
    );

    const message = msgResult.rows[0];

    // Update conversation timestamp
    await client.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Update last_read_at for sender
    await client.query(
      `UPDATE conversation_participants 
       SET last_read_at = NOW() 
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, senderId]
    );

    // Clear cache
    await deleteCache(`messages:${conversationId}`);
    await deleteCache(`conversations:${senderId}`);
    await publishMessageEvent({
      eventType: 'message',
      conversationId,
      actorUserId: senderId,
      createdAt: message.created_at,
    });

    return message;
  });
}

/**
 * Get messages for conversation
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  options: { limit?: number; before?: string; after?: string } = {}
): Promise<Message[]> {
  const { limit = 50, before, after } = options;

  // Verify access
  const hasAccess = await queryOne(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );

  if (!hasAccess) {
    throw new Error('Access denied');
  }

  let query_str = `
    SELECT * FROM messages 
    WHERE conversation_id = $1
  `;
  const params: any[] = [conversationId];

  if (before) {
    query_str += ` AND created_at < (SELECT created_at FROM messages WHERE id = $${params.length + 1})`;
    params.push(before);
  }

  if (after) {
    query_str += ` AND created_at > (SELECT created_at FROM messages WHERE id = $${params.length + 1})`;
    params.push(after);
  }

  query_str += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await query<Message>(query_str, params);

  // Mark messages as read
  const readResult = await query(
    `UPDATE messages SET is_read = true, read_at = NOW()
     WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
    [conversationId, userId]
  );

  if ((readResult.rowCount || 0) > 0) {
    await query(
      `UPDATE conversation_participants
       SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    await deleteCache(`conversations:${userId}`);
    await deleteCache(`unread:${userId}`);
    await publishMessageEvent({
      eventType: 'read',
      conversationId,
      actorUserId: userId,
      createdAt: new Date().toISOString(),
    });
  }

  return result.rows.reverse(); // Return in chronological order
}

/**
 * Get user's conversations
 */
export async function getUserConversations(userId: string): Promise<ConversationWithUser[]> {
  const cacheKey = `conversations:${userId}`;
  const cached = await getCache<ConversationWithUser[]>(cacheKey);
  if (cached) return cached;

  const result = await query<ConversationWithUser>(
    `WITH user_conversations AS (
      SELECT c.*
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.user_id = $1
    ),
    last_messages AS (
      SELECT DISTINCT ON (conversation_id) *
      FROM messages
      ORDER BY conversation_id, created_at DESC
    )
    SELECT 
      uc.*,
      json_build_object(
        'id', lm.id,
        'conversation_id', lm.conversation_id,
        'sender_id', lm.sender_id,
        'content', lm.content,
        'type', lm.type,
        'is_read', lm.is_read,
        'created_at', lm.created_at
      ) as last_message,
      (
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.conversation_id = uc.id
        AND m.sender_id != $1
        AND m.is_read = false
      ) as unread_count,
      CASE 
        WHEN NOT uc.is_group THEN (
          SELECT json_build_object(
            'id', u.id,
            'full_name', u.full_name,
            'username', u.username,
            'avatar_url', u.avatar_url
          )
          FROM conversation_participants cp
          JOIN users u ON u.id = cp.user_id
          WHERE cp.conversation_id = uc.id AND cp.user_id != $1
          LIMIT 1
        )
        ELSE NULL
      END as other_user
    FROM user_conversations uc
    LEFT JOIN last_messages lm ON lm.conversation_id = uc.id
    ORDER BY uc.updated_at DESC`,
    [userId]
  );

  await setCache(cacheKey, result.rows, 60);
  return result.rows;
}

/**
 * Get total unread message count
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const cacheKey = `unread:${userId}`;
  const cached = await getCache<number>(cacheKey);
  if (cached !== null) return cached;

  const result = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int as count
     FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
     WHERE cp.user_id = $1
     AND m.sender_id != $1
     AND m.is_read = false`,
    [userId]
  );

  const count = result?.count || 0;
  await setCache(cacheKey, count, 30);
  return count;
}

/**
 * Edit message
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
): Promise<Message> {
  const result = await queryOne<Message>(
    `UPDATE messages 
     SET content = $1, edited_at = NOW()
     WHERE id = $2 AND sender_id = $3
     RETURNING *`,
    [newContent, messageId, userId]
  );

  if (!result) {
    throw new Error('Message not found or unauthorized');
  }

  return result;
}

/**
 * Delete message (soft delete)
 */
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE messages 
     SET content = '[silindi]', metadata = NULL
     WHERE id = $1 AND sender_id = $2`,
    [messageId, userId]
  );

  return (result.rowCount || 0) > 0;
}

/**
 * Share place in conversation
 */
export async function sharePlace(
  conversationId: string,
  senderId: string,
  placeId: string,
  placeName: string,
  message?: string
): Promise<Message> {
  return sendMessage(
    conversationId,
    senderId,
    message || `${placeName} mekanını seninle paylaşıyorum`,
    'place_share',
    { place_id: placeId, place_name: placeName }
  );
}

/**
 * Share location
 */
export async function shareLocation(
  conversationId: string,
  senderId: string,
  latitude: number,
  longitude: number,
  message?: string
): Promise<Message> {
  return sendMessage(
    conversationId,
    senderId,
    message || 'Konum paylaşıldı',
    'location',
    { latitude, longitude }
  );
}

/**
 * Add participant to group
 */
export async function addGroupParticipant(
  conversationId: string,
  adminId: string,
  newUserId: string
): Promise<void> {
  // Verify admin is participant
  const isParticipant = await queryOne(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, adminId]
  );

  if (!isParticipant) {
    throw new Error('Access denied');
  }

  // Verify it's a group
  const conversation = await queryOne<Conversation>(
    'SELECT * FROM conversations WHERE id = $1 AND is_group = true',
    [conversationId]
  );

  if (!conversation) {
    throw new Error('Not a group conversation');
  }

  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [conversationId, newUserId]
  );
}

/**
 * Leave group conversation
 */
export async function leaveGroup(conversationId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );

  if ((result.rowCount || 0) > 0) {
    // Check if any participants left
    const remaining = await queryOne(
      'SELECT COUNT(*)::int as count FROM conversation_participants WHERE conversation_id = $1',
      [conversationId]
    );

    if (remaining?.count === 0) {
      // Delete empty conversation
      await query('DELETE FROM conversations WHERE id = $1', [conversationId]);
    }

    return true;
  }

  return false;
}

/**
 * Get conversation participants
 */
export async function getConversationParticipants(
  conversationId: string
): Promise<ConversationParticipant[]> {
  const result = await query<ConversationParticipant>(
    `SELECT 
      cp.user_id,
      u.full_name,
      u.username,
      u.avatar_url,
      cp.joined_at,
      cp.last_read_at
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.conversation_id = $1`,
    [conversationId]
  );

  return result.rows;
}

/**
 * Explicitly mark a conversation as read and return affected row count.
 */
export async function markConversationRead(conversationId: string, userId: string): Promise<number> {
  const hasAccess = await queryOne(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );

  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const updated = await query(
    `UPDATE messages
     SET is_read = true, read_at = NOW()
     WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
    [conversationId, userId]
  );

  await query(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  await deleteCache(`messages:${conversationId}`);
  await deleteCache(`conversations:${userId}`);
  await deleteCache(`unread:${userId}`);

  await publishMessageEvent({
    eventType: 'read',
    conversationId,
    actorUserId: userId,
    createdAt: new Date().toISOString(),
  });

  return updated.rowCount || 0;
}

/**
 * Set typing status for a user in a conversation.
 */
export async function setConversationTyping(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const hasAccess = await queryOne(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );

  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const bucket = typingStateByConversation.get(conversationId) || new Map<string, TypingState>();
  if (isTyping) {
    bucket.set(userId, { userId, expiresAt: Date.now() + TYPING_TTL_MS });
    typingStateByConversation.set(conversationId, bucket);
  } else {
    bucket.delete(userId);
    if (bucket.size === 0) typingStateByConversation.delete(conversationId);
  }

  await publishMessageEvent({
    eventType: 'typing',
    conversationId,
    actorUserId: userId,
    createdAt: new Date().toISOString(),
    isTyping,
  });
}

/**
 * Return active typing user ids in a conversation.
 */
export function getConversationTypingUsers(conversationId: string, excludeUserId?: string): string[] {
  const now = Date.now();
  const bucket = typingStateByConversation.get(conversationId);
  if (!bucket) return [];

  const result: string[] = [];
  for (const [userId, state] of bucket.entries()) {
    if (state.expiresAt <= now) {
      bucket.delete(userId);
      continue;
    }
    if (excludeUserId && userId === excludeUserId) continue;
    result.push(userId);
  }

  if (bucket.size === 0) {
    typingStateByConversation.delete(conversationId);
  }

  return result;
}

/**
 * Returns conversation-level read timeline for participants.
 */
export async function getConversationReadReceipts(
  conversationId: string,
  userId: string
): Promise<ConversationReadReceipt[]> {
  const hasAccess = await queryOne(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const result = await query<ConversationReadReceipt>(
    `SELECT
      cp.user_id,
      u.full_name,
      u.username,
      cp.last_read_at
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.conversation_id = $1
     ORDER BY cp.last_read_at DESC NULLS LAST, cp.joined_at ASC`,
    [conversationId]
  );

  return result.rows;
}
