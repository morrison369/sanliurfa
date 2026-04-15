/**
 * WebSocket Real-time Chat
 * Browser-based chat system
 */

import { query } from '../postgres';
import { logger } from '../logging';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'system';
  replyTo?: string;
  createdAt: Date;
  editedAt?: Date;
  isDeleted: boolean;
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group' | 'support';
  name?: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date;
}

export interface ChatParticipant {
  userId: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

// WebSocket connections store
const connections = new Map<string, WebSocket>();
const roomSubscriptions = new Map<string, Set<string>>(); // roomId -> Set<userId>

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(port: number = 8080): void {
  // In production, this would create a WebSocketServer
  logger.info(`[WebSocket] Server would start on port ${port}`);
}

/**
 * Handle new WebSocket connection
 */
export function handleConnection(ws: WebSocket, userId: string): void {
  connections.set(userId, ws);
  
  // Update user online status
  updateUserStatus(userId, true);
  
  // Send unread message counts
  sendUnreadCounts(userId);
  
  ws.addEventListener('message', (event) => {
    handleMessage(userId, event.data);
  });
  
  ws.addEventListener('close', () => {
    connections.delete(userId);
    updateUserStatus(userId, false);
  });
  
  ws.addEventListener('error', (error) => {
    logger.error(`[WebSocket] Error for user ${userId}:`, error);
  });
}

/**
 * Handle incoming message
 */
async function handleMessage(userId: string, data: any): Promise<void> {
  try {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'join_room':
        await joinRoom(userId, message.roomId);
        break;
        
      case 'leave_room':
        leaveRoom(userId, message.roomId);
        break;
        
      case 'send_message':
        await sendChatMessage(userId, message.roomId, message.content, message.replyTo);
        break;
        
      case 'typing':
        broadcastTyping(userId, message.roomId, message.isTyping);
        break;
        
      case 'mark_read':
        await markMessagesRead(userId, message.roomId);
        break;
        
      case 'edit_message':
        await editMessage(userId, message.messageId, message.content);
        break;
        
      case 'delete_message':
        await deleteMessage(userId, message.messageId);
        break;
    }
  } catch (error) {
    logger.error('[WebSocket] Message handling error:', error);
    sendToUser(userId, { type: 'error', message: 'Invalid message format' });
  }
}

/**
 * Join a chat room
 */
async function joinRoom(userId: string, roomId: string): Promise<void> {
  // Check if user is participant
  const participant = await query(
    'SELECT 1 FROM chat_participants WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  
  if (participant.rows.length === 0) {
    sendToUser(userId, { type: 'error', message: 'Not a participant of this room' });
    return;
  }
  
  // Subscribe to room
  if (!roomSubscriptions.has(roomId)) {
    roomSubscriptions.set(roomId, new Set());
  }
  roomSubscriptions.get(roomId)!.add(userId);
  
  // Send recent messages
  const messages = await getRecentMessages(roomId, 50);
  sendToUser(userId, { type: 'room_history', roomId, messages });
  
  // Notify others
  broadcastToRoom(roomId, {
    type: 'user_joined',
    roomId,
    userId,
  }, [userId]);
}

/**
 * Leave a chat room
 */
function leaveRoom(userId: string, roomId: string): void {
  roomSubscriptions.get(roomId)?.delete(userId);
  
  broadcastToRoom(roomId, {
    type: 'user_left',
    roomId,
    userId,
  }, [userId]);
}

/**
 * Send chat message
 */
async function sendChatMessage(
  userId: string,
  roomId: string,
  content: string,
  replyTo?: string
): Promise<void> {
  // Get sender info
  const userResult = await query(
    'SELECT full_name, avatar_url FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) return;
  
  const sender = userResult.rows[0];
  
  // Save message
  const result = await query(
    `INSERT INTO chat_messages (room_id, sender_id, sender_name, sender_avatar, content, reply_to, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [roomId, userId, sender.full_name, sender.avatar_url, content, replyTo]
  );
  
  const message = result.rows[0];
  
  // Update room's last message
  await query(
    'UPDATE chat_rooms SET last_message_at = NOW() WHERE id = $1',
    [roomId]
  );
  
  // Broadcast to room
  broadcastToRoom(roomId, {
    type: 'new_message',
    message: {
      id: message.id,
      roomId: message.room_id,
      senderId: message.sender_id,
      senderName: message.sender_name,
      senderAvatar: message.sender_avatar,
      content: message.content,
      replyTo: message.reply_to,
      createdAt: message.created_at,
    },
  });
  
  // Send notification to offline users
  const participants = await query(
    'SELECT user_id FROM chat_participants WHERE room_id = $1 AND user_id != $2',
    [roomId, userId]
  );
  
  for (const p of participants.rows) {
    if (!connections.has(p.user_id)) {
      // User is offline, send push notification
      await createNotification(p.user_id, 'new_message', {
        title: `Yeni mesaj: ${sender.full_name}`,
        body: content.substring(0, 100),
        roomId,
      });
    }
  }
}

/**
 * Broadcast typing indicator
 */
function broadcastTyping(userId: string, roomId: string, isTyping: boolean): void {
  broadcastToRoom(roomId, {
    type: 'typing',
    roomId,
    userId,
    isTyping,
  }, [userId]);
}

/**
 * Mark messages as read
 */
async function markMessagesRead(userId: string, roomId: string): Promise<void> {
  await query(
    `UPDATE chat_message_status 
     SET is_read = true, read_at = NOW()
     WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId]
  );
  
  // Notify sender
  broadcastToRoom(roomId, {
    type: 'messages_read',
    roomId,
    userId,
  });
}

/**
 * Edit message
 */
async function editMessage(userId: string, messageId: string, content: string): Promise<void> {
  const result = await query(
    `UPDATE chat_messages 
     SET content = $1, edited_at = NOW()
     WHERE id = $2 AND sender_id = $3
     RETURNING room_id`,
    [content, messageId, userId]
  );
  
  if (result.rows.length === 0) return;
  
  const roomId = result.rows[0].room_id;
  
  broadcastToRoom(roomId, {
    type: 'message_edited',
    messageId,
    content,
    editedAt: new Date(),
  });
}

/**
 * Delete message (soft delete)
 */
async function deleteMessage(userId: string, messageId: string): Promise<void> {
  const result = await query(
    `UPDATE chat_messages 
     SET is_deleted = true, content = '[Silindi]'
     WHERE id = $1 AND sender_id = $2
     RETURNING room_id`,
    [messageId, userId]
  );
  
  if (result.rows.length === 0) return;
  
  const roomId = result.rows[0].room_id;
  
  broadcastToRoom(roomId, {
    type: 'message_deleted',
    messageId,
  });
}

/**
 * Get recent messages
 */
async function getRecentMessages(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
  const result = await query(
    `SELECT * FROM chat_messages 
    WHERE room_id = $1 AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT $2`,
    [roomId, limit]
  );
  
  return result.rows.map(mapMessageRow).reverse();
}

/**
 * Get user's chat rooms
 */
export async function getUserChatRooms(userId: string): Promise<ChatRoom[]> {
  const result = await query(
    `SELECT r.*, 
      (SELECT content FROM chat_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
      (SELECT created_at FROM chat_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM chat_message_status WHERE room_id = r.id AND user_id = $1 AND is_read = false) as unread_count
    FROM chat_rooms r
    JOIN chat_participants p ON r.id = p.room_id
    WHERE p.user_id = $1
    ORDER BY last_message_at DESC NULLS LAST`,
    [userId]
  );
  
  return Promise.all(result.rows.map(async (row: any) => {
    const participants = await getRoomParticipants(row.id);
    
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      participants,
      lastMessage: row.last_message_content ? {
        id: 'temp',
        roomId: row.id,
        senderId: '',
        senderName: '',
        content: row.last_message_content,
        type: 'text',
        createdAt: new Date(row.last_message_at),
        isDeleted: false,
      } : undefined,
      unreadCount: parseInt(row.unread_count),
      createdAt: new Date(row.created_at),
    };
  }));
}

/**
 * Create chat room
 */
export async function createChatRoom(
  type: 'direct' | 'group' | 'support',
  participantIds: string[],
  name?: string
): Promise<string> {
  const roomId = `room_${Date.now()}`;
  
  await query(
    'INSERT INTO chat_rooms (id, type, name, created_at) VALUES ($1, $2, $3, NOW())',
    [roomId, type, name]
  );
  
  // Add participants
  for (const userId of participantIds) {
    await query(
      'INSERT INTO chat_participants (room_id, user_id, joined_at) VALUES ($1, $2, NOW())',
      [roomId, userId]
    );
  }
  
  return roomId;
}

/**
 * Get room participants
 */
async function getRoomParticipants(roomId: string): Promise<ChatParticipant[]> {
  const result = await query(
    `SELECT p.user_id, u.full_name, u.avatar_url, p.is_online, p.last_seen_at
    FROM chat_participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.room_id = $1`,
    [roomId]
  );
  
  return result.rows.map(row => ({
    userId: row.user_id,
    name: row.full_name,
    avatar: row.avatar_url,
    isOnline: row.is_online,
    lastSeen: row.last_seen_at ? new Date(row.last_seen_at) : undefined,
  }));
}

/**
 * Update user online status
 */
async function updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
  await query(
    `UPDATE chat_participants 
     SET is_online = $1, last_seen_at = CASE WHEN $1 = false THEN NOW() ELSE last_seen_at END
     WHERE user_id = $2`,
    [isOnline, userId]
  );
}

/**
 * Send message to specific user
 */
function sendToUser(userId: string, data: any): void {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Broadcast to room
 */
function broadcastToRoom(roomId: string, data: any, excludeUserIds: string[] = []): void {
  const subscribers = roomSubscriptions.get(roomId);
  if (!subscribers) return;
  
  for (const userId of subscribers) {
    if (!excludeUserIds.includes(userId)) {
      sendToUser(userId, data);
    }
  }
}

/**
 * Send unread counts to user
 */
async function sendUnreadCounts(userId: string): Promise<void> {
  const result = await query(
    `SELECT room_id, COUNT(*) as count
    FROM chat_message_status
    WHERE user_id = $1 AND is_read = false
    GROUP BY room_id`,
    [userId]
  );
  
  sendToUser(userId, {
    type: 'unread_counts',
    counts: result.rows.reduce((acc: any, row: any) => {
      acc[row.room_id] = parseInt(row.count);
      return acc;
    }, {}),
  });
}

/**
 * Create notification
 */
async function createNotification(
  userId: string,
  type: string,
  data: any
): Promise<void> {
  // This would integrate with your notification system
  logger.info(`[Notification] ${type} for user ${userId}:`, data);
}

function mapMessageRow(row: any): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    content: row.content,
    type: row.type,
    replyTo: row.reply_to,
    createdAt: new Date(row.created_at),
    editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
    isDeleted: row.is_deleted,
  };
}
