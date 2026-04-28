import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getConversationReadReceipts: vi.fn(),
}));

vi.mock('../auth', () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock('../social/messaging-db', () => ({
  getConversationReadReceipts: mocks.getConversationReadReceipts,
}));

import { GET } from '../../pages/api/social/messages/receipts';

describe('social message receipts api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.requireAuth.mockResolvedValueOnce({ user: null });
    const response = await GET(
      createApiContext({ url: 'http://localhost:4321/api/social/messages/receipts?conversationId=c1' }),
    );
    expect(response.status).toBe(401);
  });

  it('returns receipts payload', async () => {
    mocks.requireAuth.mockResolvedValueOnce({ user: { id: 'u1' } });
    mocks.getConversationReadReceipts.mockResolvedValueOnce([{ user_id: 'u2', full_name: 'U2', last_read_at: null }]);
    const response = await GET(
      createApiContext({ url: 'http://localhost:4321/api/social/messages/receipts?conversationId=c1' }),
    );
    const body = await parseJson(response);
    expect(response.status).toBe(200);
    expect(body?.success).toBe(true);
    expect(body?.receipts?.length).toBe(1);
  });
});

