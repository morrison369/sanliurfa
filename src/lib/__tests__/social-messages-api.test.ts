import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  getUserConversations: vi.fn(),
  getOrCreateConversation: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  getTotalUnreadCount: vi.fn(),
  markConversationRead: vi.fn(),
  setConversationTyping: vi.fn(),
  getConversationTypingUsers: vi.fn(),
  sharePlace: vi.fn(),
  shareLocation: vi.fn(),
  auditSiteChange: vi.fn(),
  enforceSocialRateLimit: vi.fn(),
}));

vi.mock('../auth', () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock('../social/messaging-db', () => ({
  getMessages: mocks.getMessages,
  sendMessage: mocks.sendMessage,
  getUserConversations: mocks.getUserConversations,
  getOrCreateConversation: mocks.getOrCreateConversation,
  editMessage: mocks.editMessage,
  deleteMessage: mocks.deleteMessage,
  getTotalUnreadCount: mocks.getTotalUnreadCount,
  markConversationRead: mocks.markConversationRead,
  setConversationTyping: mocks.setConversationTyping,
  getConversationTypingUsers: mocks.getConversationTypingUsers,
  sharePlace: mocks.sharePlace,
  shareLocation: mocks.shareLocation,
}));

vi.mock('../site-content', () => ({
  auditSiteChange: mocks.auditSiteChange,
}));

vi.mock('../social/abuse-policy', () => ({
  enforceSocialRateLimit: mocks.enforceSocialRateLimit,
}));

import { GET, POST } from '../../pages/api/social/messages';

describe('social messages api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', email: 'u1@x.com' } });
    mocks.enforceSocialRateLimit.mockResolvedValue({
      allowed: true,
      tenantId: 'default',
      policy: { limit: 100, windowSeconds: 60 },
    });
    mocks.getConversationTypingUsers.mockReturnValue([]);
  });

  it('GET returns typing users for conversation view', async () => {
    mocks.getMessages.mockResolvedValue([{ id: 'm1', content: 'merhaba' }]);
    mocks.getConversationTypingUsers.mockReturnValue(['u2']);

    const response = await GET(
      createApiContext({
        url: 'http://localhost:4321/api/social/messages?conversationId=c1',
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.typingUsers).toEqual(['u2']);
  });

  it('POST markRead validates conversationId', async () => {
    const response = await POST(
      createApiContext({
        method: 'POST',
        url: 'http://localhost:4321/api/social/messages',
        body: { action: 'markRead' },
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('POST typing updates typing state', async () => {
    mocks.getConversationTypingUsers.mockReturnValue(['u2']);

    const response = await POST(
      createApiContext({
        method: 'POST',
        url: 'http://localhost:4321/api/social/messages',
        body: { action: 'typing', conversationId: 'c1', isTyping: true },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(mocks.setConversationTyping).toHaveBeenCalledWith('c1', 'u1', true);
    expect(body?.typingUsers).toEqual(['u2']);
  });
});

