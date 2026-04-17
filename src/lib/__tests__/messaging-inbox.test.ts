import { describe, expect, it } from 'vitest';

import {
  applyMessagingInboxSelection,
  createMessagingInboxState,
  extractMessagingInboxConversations,
  extractMessagingInboxMessages,
  renderMessagingInbox,
} from '../messaging-inbox';

describe('messaging inbox helpers', () => {
  it('extracts conversations from api response', () => {
    const conversations = extractMessagingInboxConversations({
      success: true,
      data: [
        {
          id: 'conv-1',
          full_name: 'Ali Veli',
          content: 'Son mesaj',
          msg_time: '2026-04-17T08:10:00.000Z',
          unread: '2',
        },
      ],
    });

    expect(conversations[0]).toEqual({
      id: 'conv-1',
      participantName: 'Ali Veli',
      lastMessage: 'Son mesaj',
      lastMessageTime: '2026-04-17T08:10:00.000Z',
      unreadCount: 2,
    });
  });

  it('extracts messages from api response', () => {
    const messages = extractMessagingInboxMessages({
      success: true,
      data: [
        { id: 'msg-1', content: 'Merhaba', created_at: '2026-04-17T08:11:00.000Z', sender_id: 'user-1' },
      ],
    });

    expect(messages[0]?.senderId).toBe('user-1');
  });

  it('applies fallback selection and renders inbox', () => {
    const state = applyMessagingInboxSelection({
      ...createMessagingInboxState(),
      loading: false,
      conversations: [
        {
          id: 'conv-1',
          participantName: 'Ali Veli',
          lastMessage: 'Selam',
          lastMessageTime: '2026-04-17T08:10:00.000Z',
          unreadCount: 1,
        },
      ],
      messages: [
        { id: 'msg-1', content: 'Selam', createdAt: '2026-04-17T08:11:00.000Z', senderId: 'user-1' },
      ],
      draft: 'Test',
    });

    const html = renderMessagingInbox(state, 'user-1');
    expect(state.selectedConversationId).toBe('conv-1');
    expect(html).toContain('Mesajlar');
    expect(html).toContain('Ali Veli');
    expect(html).toContain('Konusmayi gizle');
  });
});
