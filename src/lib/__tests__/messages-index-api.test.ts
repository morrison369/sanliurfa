/**
 * API Contract Tests - GET + POST /api/messages
 *
 * GET:
 * - Auth required → 401
 * - safeIntParam limit + offset (HARD RULE #17)
 * - getConversations called with userId/limit/offset
 *
 * POST:
 * - Auth required → 401
 * - recipient_id (snake_case) OR recipientId (camelCase) accepted
 * - Empty/missing recipient → 400 + UUID 36-char limit
 * - Recipient not in DB → 404
 * - getOrCreateConversation called + content empty → message null
 * - content non-empty → sendMessage called
 *
 * vi.hoisted - messages helpers + postgres + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext } from './helpers/api-test-helpers';

const {
  getConversationsMock, getOrCreateConversationMock, sendMessageMock, queryOneMock,
} = vi.hoisted(() => ({
  getConversationsMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  sendMessageMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

vi.mock('../message/messages', () => ({
  getConversations: getConversationsMock,
  getOrCreateConversation: getOrCreateConversationMock,
  sendMessage: sendMessageMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  getConversationsMock.mockReset();
  getConversationsMock.mockResolvedValue([]);
  getOrCreateConversationMock.mockReset();
  getOrCreateConversationMock.mockResolvedValue({ id: 'convo-1' });
  sendMessageMock.mockReset();
  sendMessageMock.mockResolvedValue({ id: 'msg-1', content: 'hi' });
  queryOneMock.mockReset();
  queryOneMock.mockResolvedValue({ id: 'recipient-1' });
});

import { GET, POST } from '../../pages/api/messages';

const authedUser = { id: 'sender-1', email: 's@t.com', role: 'user' };

describe('GET /api/messages', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/messages', locals: {} });
    const resp = await GET(ctx);
    expect(resp.status).toBe(401);
  });

  it('default limit/offset (HARD RULE #17 safeIntParam)', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/messages', locals: { user: authedUser } });
    await GET(ctx);
    expect(getConversationsMock).toHaveBeenCalledWith('sender-1', 50, 0);
  });

  it('custom limit + offset passed through', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/messages?limit=10&offset=20',
      locals: { user: authedUser },
    });
    await GET(ctx);
    expect(getConversationsMock).toHaveBeenCalledWith('sender-1', 10, 20);
  });

  it('non-numeric limit → fallback default 50', async () => {
    const ctx = createApiContext({
      url: 'http://localhost/api/messages?limit=abc',
      locals: { user: authedUser },
    });
    await GET(ctx);
    expect(getConversationsMock.mock.calls[0][1]).toBe(50);
  });
});

describe('POST /api/messages', () => {
  it('no auth → 401', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'r-1' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
  });

  it('missing recipient → 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { content: 'hi' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('recipient > 36 chars → 400 (UUID guard)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'a'.repeat(37) },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('empty string recipient → 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: '   ' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('recipient not in DB → 404', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'non-existent' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(404);
    expect(getOrCreateConversationMock).not.toHaveBeenCalled();
  });

  it('snake_case recipient_id accepted', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'recipient-1', content: 'hi' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(getOrCreateConversationMock).toHaveBeenCalledWith('sender-1', 'recipient-1');
  });

  it('camelCase recipientId accepted (alias)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipientId: 'recipient-1', content: 'hi' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(getOrCreateConversationMock).toHaveBeenCalledWith('sender-1', 'recipient-1');
  });

  it('empty content → message null (conversation only)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'recipient-1' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('non-empty content → sendMessage(convoId, senderId, content)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'recipient-1', content: '  Hello  ' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    expect(sendMessageMock).toHaveBeenCalledWith('convo-1', 'sender-1', 'Hello');
  });

  it('whitespace-only content → message null', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'recipient-1', content: '   ' },
      locals: { user: authedUser },
    });
    await POST(ctx);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('helper throws → 500', async () => {
    getOrCreateConversationMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx = createApiContext({
      method: 'POST',
      body: { recipient_id: 'recipient-1', content: 'hi' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });
});
