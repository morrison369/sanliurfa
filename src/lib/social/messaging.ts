/**
 * Direct Messaging System
 * Real-time chat between users
 */

import { generateId } from '../utils';

// Message types
export type MessageType = 'text' | 'image' | 'location' | 'place_share' | 'voice';

// Message status
export type MessageStatus = 'sent' | 'delivered' | 'read';

// Chat message
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  metadata?: {
    placeId?: string;
    placeName?: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    duration?: number; // for voice
  };
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  editedAt?: string;
}

// Conversation
export interface Conversation {
  id: string;
  participants: string[]; // user IDs
  lastMessage?: Message;
  unreadCount: Record<string, number>; // userId -> count
  createdAt: string;
  updatedAt: string;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
}

// Typing indicator
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

// In-memory store
const conversations: Map<string, Conversation> = new Map();
const messages: Map<string, Message> = new Map();
const typingIndicators: Map<string, TypingIndicator> = new Map();

/**
 * Create or get conversation between two users
 */
export function getOrCreateConversation(userId1: string, userId2: string): Conversation {
  // Check if conversation exists
  for (const conv of conversations.values()) {
    if (
      !conv.isGroup &&
      conv.participants.includes(userId1) &&
      conv.participants.includes(userId2)
    ) {
      return conv;
    }
  }

  // Create new conversation
  const conversation: Conversation = {
    id: generateId(),
    participants: [userId1, userId2],
    unreadCount: { [userId1]: 0, [userId2]: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isGroup: false,
  };

  conversations.set(conversation.id, conversation);
  return conversation;
}

/**
 * Send message
 */
export function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType = 'text',
  metadata?: Message['metadata']
): Message {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  if (!conversation.participants.includes(senderId)) {
    throw new Error('Not a participant');
  }

  const message: Message = {
    id: generateId(),
    conversationId,
    senderId,
    content,
    type,
    metadata,
    status: 'sent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  messages.set(message.id, message);

  // Update conversation
  conversation.lastMessage = message;
  conversation.updatedAt = message.createdAt;
  
  // Increment unread for other participants
  conversation.participants.forEach(pid => {
    if (pid !== senderId) {
      conversation.unreadCount[pid] = (conversation.unreadCount[pid] || 0) + 1;
    }
  });

  return message;
}

/**
 * Edit message
 */
export function editMessage(
  messageId: string,
  userId: string,
  newContent: string
): Message {
  const message = messages.get(messageId);
  if (!message) throw new Error('Message not found');
  if (message.senderId !== userId) throw new Error('Unauthorized');

  message.content = newContent;
  message.editedAt = new Date().toISOString();
  message.updatedAt = message.editedAt;

  return message;
}

/**
 * Delete message (soft delete)
 */
export function deleteMessage(messageId: string, userId: string): boolean {
  const message = messages.get(messageId);
  if (!message) return false;
  if (message.senderId !== userId) return false;

  message.deletedAt = new Date().toISOString();
  message.content = 'Bu mesaj silindi';
  return true;
}

/**
 * Mark messages as read
 */
export function markAsRead(conversationId: string, userId: string): void {
  const conversation = conversations.get(conversationId);
  if (!conversation) return;

  // Reset unread count
  conversation.unreadCount[userId] = 0;

  // Mark messages as read
  for (const msg of messages.values()) {
    if (
      msg.conversationId === conversationId &&
      msg.senderId !== userId &&
      msg.status !== 'read'
    ) {
      msg.status = 'read';
    }
  }
}

/**
 * Get conversation messages
 */
export function getMessages(
  conversationId: string,
  options: {
    limit?: number;
    before?: string; // message ID
    after?: string;
  } = {}
): Message[] {
  const { limit = 50, before, after } = options;
  
  let convMessages = Array.from(messages.values())
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (before) {
    const beforeIndex = convMessages.findIndex(m => m.id === before);
    convMessages = convMessages.slice(0, beforeIndex);
  }

  if (after) {
    const afterIndex = convMessages.findIndex(m => m.id === after);
    convMessages = convMessages.slice(afterIndex + 1);
  }

  return convMessages.slice(-limit);
}

/**
 * Get user conversations
 */
export function getUserConversations(userId: string): Conversation[] {
  return Array.from(conversations.values())
    .filter(c => c.participants.includes(userId))
    .sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

/**
 * Get total unread count for user
 */
export function getTotalUnreadCount(userId: string): number {
  let total = 0;
  for (const conv of conversations.values()) {
    if (conv.participants.includes(userId)) {
      total += conv.unreadCount[userId] || 0;
    }
  }
  return total;
}

/**
 * Set typing indicator
 */
export function setTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean
): void {
  const key = `${conversationId}:${userId}`;
  typingIndicators.set(key, {
    conversationId,
    userId,
    isTyping,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get typing users in conversation
 */
export function getTypingUsers(conversationId: string, excludeUserId: string): string[] {
  const typing: string[] = [];
  for (const indicator of typingIndicators.values()) {
    if (
      indicator.conversationId === conversationId &&
      indicator.userId !== excludeUserId &&
      indicator.isTyping
    ) {
      // Check if recent (within 10 seconds)
      const age = Date.now() - new Date(indicator.timestamp).getTime();
      if (age < 10000) {
        typing.push(indicator.userId);
      }
    }
  }
  return typing;
}

/**
 * Share place in message
 */
export function sharePlace(
  conversationId: string,
  senderId: string,
  placeId: string,
  placeName: string,
  message?: string
): Message {
  return sendMessage(
    conversationId,
    senderId,
    message || `${placeName} mekanını seninle paylaşıyorum`,
    'place_share',
    { placeId, placeName }
  );
}

/**
 * Send location
 */
export function sendLocation(
  conversationId: string,
  senderId: string,
  latitude: number,
  longitude: number,
  message?: string
): Message {
  return sendMessage(
    conversationId,
    senderId,
    message || 'Konum paylaşıldı',
    'location',
    { latitude, longitude }
  );
}

/**
 * Create group conversation
 */
export function createGroup(
  creatorId: string,
  name: string,
  participantIds: string[],
  avatar?: string
): Conversation {
  const conversation: Conversation = {
    id: generateId(),
    participants: [creatorId, ...participantIds],
    unreadCount: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isGroup: true,
    groupName: name,
    groupAvatar: avatar,
  };

  // Initialize unread counts
  conversation.participants.forEach(pid => {
    conversation.unreadCount[pid] = 0;
  });

  conversations.set(conversation.id, conversation);
  
  // Send system message
  sendMessage(conversation.id, creatorId, 'Grup oluşturuldu', 'text');
  
  return conversation;
}

/**
 * Add participant to group
 */
export function addGroupParticipant(
  conversationId: string,
  adminId: string,
  newParticipantId: string
): Conversation {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  if (!conversation.isGroup) throw new Error('Not a group');
  if (!conversation.participants.includes(adminId)) {
    throw new Error('Unauthorized');
  }
  if (conversation.participants.includes(newParticipantId)) {
    throw new Error('Already a participant');
  }

  conversation.participants.push(newParticipantId);
  conversation.unreadCount[newParticipantId] = 0;
  conversation.updatedAt = new Date().toISOString();

  return conversation;
}

/**
 * Leave group
 */
export function leaveGroup(conversationId: string, userId: string): boolean {
  const conversation = conversations.get(conversationId);
  if (!conversation) return false;
  if (!conversation.isGroup) return false;

  conversation.participants = conversation.participants.filter(pid => pid !== userId);
  delete conversation.unreadCount[userId];

  // If no participants left, delete conversation
  if (conversation.participants.length === 0) {
    conversations.delete(conversationId);
  }

  return true;
}
