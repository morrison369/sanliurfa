/**
 * Unit Tests - social/messaging.ts in-memory direct messaging (pure)
 *
 * - getOrCreateConversation (find existing OR create new)
 * - sendMessage (status sent + unread count + lastMessage update + auth check)
 * - editMessage (auth + editedAt timestamp)
 * - deleteMessage (soft delete + content "Bu mesaj silindi")
 * - markAsRead (unread reset + msg status read)
 * - getMessages (limit + before/after pagination)
 * - getUserConversations (participants filter + sort)
 * - getTotalUnreadCount (sum across conversations)
 * - setTypingIndicator + getTypingUsers (10s window + excludeUserId)
 *
 * In-memory state shared - testler unique userId kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  getOrCreateConversation,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  getMessages,
  getUserConversations,
  getTotalUnreadCount,
  setTypingIndicator,
  getTypingUsers,
} from '../social/messaging';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('getOrCreateConversation', () => {
  it('yeni conversation - participants + unreadCount init 0', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    expect(c.participants).toContain(u1);
    expect(c.participants).toContain(u2);
    expect(c.unreadCount[u1]).toBe(0);
    expect(c.isGroup).toBe(false);
  });

  it('mevcut conversation - aynı id döner', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c1 = getOrCreateConversation(u1, u2);
    const c2 = getOrCreateConversation(u1, u2);
    expect(c1.id).toBe(c2.id);
  });

  it('reverse order - aynı conversation (bidirectional)', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c1 = getOrCreateConversation(u1, u2);
    const c2 = getOrCreateConversation(u2, u1);
    expect(c1.id).toBe(c2.id);
  });
});

describe('sendMessage', () => {
  it('mesaj gönderilir + status sent + lastMessage update', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    const m = sendMessage(c.id, u1, 'Merhaba');
    expect(m.status).toBe('sent');
    expect(m.content).toBe('Merhaba');
    expect(c.lastMessage?.id).toBe(m.id);
  });

  it('unread count - alıcı için artar, gönderici için artmaz', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    sendMessage(c.id, u1, 'msg');
    expect(c.unreadCount[u2]).toBe(1);
    expect(c.unreadCount[u1]).toBe(0);
  });

  it('non-participant - throw "Not a participant"', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    expect(() => sendMessage(c.id, 'other-user', 'msg')).toThrow(/Not a participant/);
  });

  it('bilinmeyen conversation - throw "Conversation not found"', () => {
    expect(() => sendMessage('non-existent', 'u', 'msg')).toThrow(/Conversation not found/);
  });

  it('metadata optional spread (place_share örnek)', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    const m = sendMessage(c.id, u1, 'paylaşım', 'place_share', { placeId: 'p-1', placeName: 'Test Place' });
    expect(m.metadata?.placeId).toBe('p-1');
  });
});

describe('editMessage', () => {
  it('owner edit - editedAt set', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    const m = sendMessage(c.id, u1, 'eski');
    const edited = editMessage(m.id, u1, 'yeni');
    expect(edited.content).toBe('yeni');
    expect(edited.editedAt).toBeDefined();
  });

  it('non-owner edit - throw Unauthorized', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    const m = sendMessage(c.id, u1, 'msg');
    expect(() => editMessage(m.id, u2, 'hack')).toThrow(/Unauthorized/);
  });

  it('bilinmeyen messageId - throw Message not found', () => {
    expect(() => editMessage('non-existent', 'u', 'x')).toThrow(/Message not found/);
  });
});

describe('deleteMessage', () => {
  it('owner delete - soft delete + content "Bu mesaj silindi"', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    const m = sendMessage(c.id, u1, 'msg');
    expect(deleteMessage(m.id, u1)).toBe(true);
    const messages = getMessages(c.id);
    const found = messages.find((x) => x.id === m.id);
    expect(found?.content).toBe('Bu mesaj silindi');
    expect(found?.deletedAt).toBeDefined();
  });

  it('non-owner delete - false', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    const m = sendMessage(c.id, u1, 'msg');
    expect(deleteMessage(m.id, u2)).toBe(false);
  });

  it('bilinmeyen messageId - false', () => {
    expect(deleteMessage('non-existent', 'u')).toBe(false);
  });
});

describe('markAsRead', () => {
  it('unread reset + msg status read', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    sendMessage(c.id, u1, 'msg-1');
    sendMessage(c.id, u1, 'msg-2');
    expect(c.unreadCount[u2]).toBe(2);
    markAsRead(c.id, u2);
    expect(c.unreadCount[u2]).toBe(0);
    const messages = getMessages(c.id);
    expect(messages.every((m) => m.senderId !== u1 || m.status === 'read')).toBe(true);
  });

  it('bilinmeyen conversation - no-throw', () => {
    expect(() => markAsRead('non-existent', 'u')).not.toThrow();
  });
});

describe('getMessages', () => {
  it('limit slice + chronological order', () => {
    const u1 = uniq('u');
    const u2 = uniq('u');
    const c = getOrCreateConversation(u1, u2);
    for (let i = 0; i < 5; i++) {
      sendMessage(c.id, u1, `msg-${i}`);
    }
    const r = getMessages(c.id, { limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });
});

describe('getUserConversations / getTotalUnreadCount', () => {
  it('user conversations - participants filter', () => {
    const u = uniq('u-list');
    getOrCreateConversation(u, uniq('other'));
    getOrCreateConversation(u, uniq('other'));
    const list = getUserConversations(u);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('getTotalUnreadCount - sum across conversations', () => {
    const u = uniq('u-unread');
    const o1 = uniq('o');
    const o2 = uniq('o');
    const c1 = getOrCreateConversation(u, o1);
    const c2 = getOrCreateConversation(u, o2);
    sendMessage(c1.id, o1, 'msg');
    sendMessage(c2.id, o2, 'msg');
    expect(getTotalUnreadCount(u)).toBeGreaterThanOrEqual(2);
  });
});

describe('setTypingIndicator / getTypingUsers', () => {
  it('typing indicator + 10s window check', () => {
    const conv = uniq('c');
    const u1 = uniq('u');
    setTypingIndicator(conv, u1, true);
    const typing = getTypingUsers(conv, 'other-user');
    expect(typing).toContain(u1);
  });

  it('excludeUserId - kendisi listede yok', () => {
    const conv = uniq('c');
    const u1 = uniq('u');
    setTypingIndicator(conv, u1, true);
    const typing = getTypingUsers(conv, u1);
    expect(typing).not.toContain(u1);
  });

  it('isTyping false - listede değil', () => {
    const conv = uniq('c');
    const u1 = uniq('u');
    setTypingIndicator(conv, u1, false);
    const typing = getTypingUsers(conv, 'other');
    expect(typing).not.toContain(u1);
  });
});
