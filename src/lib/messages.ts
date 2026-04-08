/**
 * Direct Messages
 */
import { query, queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';

export async function getOrCreateConversation(userA: string, userB: string) {
  const [p1, p2] = userA < userB ? [userA, userB] : [userB, userA];
  let convo = await queryOne('SELECT * FROM conversations WHERE LEAST(participant_a::text, participant_b::text) = $1 AND GREATEST(participant_a::text, participant_b::text) = $2', [p1, p2]);
  if (!convo) {
    const id = crypto.randomUUID();
    await insert('conversations', { id, participant_a: p1, participant_b: p2, last_activity_at: new Date(), created_at: new Date() });
    convo = await queryOne('SELECT * FROM conversations WHERE id = $1', [id]);
    await deleteCachePattern(`sanliurfa:conversations:${p1}:*`);
    await deleteCachePattern(`sanliurfa:conversations:${p2}:*`);
  }
  return convo;
}

export async function getConversations(userId: string, limit = 50, offset = 0) {
  const cacheKey = `sanliurfa:conversations:${userId}:inbox:${limit}:${offset}`;
  const cached = await getCache(cacheKey);
  if (cached) return JSON.parse(cached);
  const convos = await queryMany(
    `SELECT c.*, u.full_name, u.avatar_url, dm.content, dm.created_at as msg_time,
            COUNT(CASE WHEN dm.read_at IS NULL AND dm.sender_id != $1 THEN 1 END) as unread
     FROM conversations c
     LEFT JOIN users u ON (CASE WHEN c.participant_a = $1 THEN c.participant_b = u.id ELSE c.participant_a = u.id END)
     LEFT JOIN direct_messages dm ON c.last_message_id = dm.id
     WHERE c.participant_a = $1 OR c.participant_b = $1
     GROUP BY c.id, u.id, dm.id
     ORDER BY c.last_activity_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  await setCache(cacheKey, JSON.stringify(convos), 300);
  return convos;
}

export async function getMessages(conversationId: string, userId: string, limit = 50) {
  const convo = await queryOne('SELECT participant_a, participant_b FROM conversations WHERE id = $1', [conversationId]);
  if (!convo || (convo.participant_a !== userId && convo.participant_b !== userId)) throw new Error('Unauthorized');
  return queryMany('SELECT * FROM direct_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2', [conversationId, limit]);
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const convo = await queryOne('SELECT participant_a, participant_b FROM conversations WHERE id = $1', [conversationId]);
  if (!convo || (convo.participant_a !== senderId && convo.participant_b !== senderId)) throw new Error('Unauthorized');
  const id = crypto.randomUUID();
  await insert('direct_messages', { id, conversation_id: conversationId, sender_id: senderId, content, created_at: new Date() });
  await update('conversations', { id: conversationId }, { last_message_id: id, last_activity_at: new Date() });
  await deleteCachePattern(`sanliurfa:conversations:*:inbox:*`);
  return queryOne('SELECT * FROM direct_messages WHERE id = $1', [id]);
}

export async function markConversationRead(conversationId: string, userId: string) {
  await query(`UPDATE direct_messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`, [conversationId, userId]);
  await deleteCachePattern(`sanliurfa:conversations:${userId}:inbox:*`);
}

export async function getUnreadCount(userId: string) {
  const result = await queryOne(
    `SELECT COUNT(*) as count FROM direct_messages dm JOIN conversations c ON dm.conversation_id = c.id
     WHERE dm.read_at IS NULL AND dm.sender_id != $1 AND (c.participant_a = $1 OR c.participant_b = $1)
     AND NOT EXISTS (SELECT 1 FROM conversation_deletions WHERE conversation_id = c.id AND user_id = $1)`,
    [userId]
  );
  return parseInt(result?.count || '0', 10);
}

export async function deleteConversation(conversationId: string, userId: string) {
  await insert('conversation_deletions', { conversation_id: conversationId, user_id: userId, deleted_at: new Date() });
  await deleteCachePattern(`sanliurfa:conversations:${userId}:inbox:*`);
}
