import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';

const getMessagesMock = vi.fn();
const sendMessageMock = vi.fn();
const markConversationReadMock = vi.fn();
const queryOneMock = vi.fn();
const queryMock = vi.fn();
const isUserBlockedMock = vi.fn();
const deleteCacheMock = vi.fn();
const recordRequestMock = vi.fn();
const verifyWebhookSignatureMock = vi.fn();
const getSubscriptionMock = vi.fn();
const updateUserQuotasMock = vi.fn();
const emailOnSubscriptionCreatedMock = vi.fn();
const emailOnPaymentSuccessMock = vi.fn();
const emailOnSubscriptionCancelledMock = vi.fn();
const verifyOAuthStateMock = vi.fn();
const getOAuthProviderMock = vi.fn();
const linkOAuthAccountMock = vi.fn();
const getOAuthAccountByProviderMock = vi.fn();
const createUserSessionMock = vi.fn();
const addTenantMemberMock = vi.fn();
const removeTenantMemberMock = vi.fn();
const logTenantAuditMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logMutation: vi.fn(),
};

vi.mock('../../../lib/messages', () => ({
  getMessages: getMessagesMock,
  sendMessage: sendMessageMock,
  markConversationRead: markConversationReadMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryOne: queryOneMock,
  query: queryMock,
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../../lib/blocking', () => ({
  isUserBlocked: isUserBlockedMock,
}));

vi.mock('../../../lib/cache', () => ({
  deleteCache: deleteCacheMock,
}));

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

vi.mock('../../../lib/stripe-client', () => ({
  verifyWebhookSignature: verifyWebhookSignatureMock,
  getSubscription: getSubscriptionMock,
}));

vi.mock('../../../lib/usage-tracking', () => ({
  updateUserQuotas: updateUserQuotasMock,
}));

vi.mock('../../../lib/subscription-email-integration', () => ({
  emailOnSubscriptionCreated: emailOnSubscriptionCreatedMock,
  emailOnPaymentSuccess: emailOnPaymentSuccessMock,
  emailOnSubscriptionCancelled: emailOnSubscriptionCancelledMock,
}));

vi.mock('../../../lib/oauth', () => ({
  verifyOAuthState: verifyOAuthStateMock,
  getOAuthProvider: getOAuthProviderMock,
  linkOAuthAccount: linkOAuthAccountMock,
  getOAuthAccountByProvider: getOAuthAccountByProviderMock,
}));

vi.mock('../../../lib/security', () => ({
  createUserSession: createUserSessionMock,
}));

vi.mock('../../../lib/multi-tenant', () => ({
  addTenantMember: addTenantMemberMock,
  removeTenantMember: removeTenantMemberMock,
  logTenantAudit: logTenantAuditMock,
}));

describe('API contract hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    queryOneMock.mockResolvedValue(null);
    isUserBlockedMock.mockResolvedValue(false);
    addTenantMemberMock.mockResolvedValue({ id: 'member-1' });
    removeTenantMemberMock.mockResolvedValue(true);
    logTenantAuditMock.mockResolvedValue(undefined);
    verifyOAuthStateMock.mockResolvedValue(null);
    getOAuthProviderMock.mockResolvedValue(null);
    getOAuthAccountByProviderMock.mockResolvedValue(null);
    createUserSessionMock.mockResolvedValue({ session_token: 'session-token' });
    verifyWebhookSignatureMock.mockResolvedValue({ id: 'evt_1', type: 'invoice.payment_failed', data: { object: { id: 'in_1', subscription: 'sub_1' } } });
  });

  it('rejects invalid messages conversation id before service calls', async () => {
    const { GET } = await import('../messages/[conversationId].ts');
    const request = new Request('https://example.com/api/messages/not-a-uuid', { headers: { 'x-request-id': 'req-1' } });

    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: 'not-a-uuid' },
    } as any);

    expect(response.status).toBe(400);
    expect(getMessagesMock).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON for messages POST', async () => {
    const { POST } = await import('../messages/[conversationId].ts');
    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(400);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tenant member role', async () => {
    const { POST } = await import('../tenants/[tenantId]/members.ts');
    queryOneMock.mockResolvedValueOnce({ owner_id: '11111111-1111-1111-1111-111111111111' });

    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: '22222222-2222-2222-2222-222222222222',
        role: 'owner'
      })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any);

    expect(response.status).toBe(422);
    expect(addTenantMemberMock).not.toHaveBeenCalled();
  });

  it('rejects owner removal in tenant members DELETE', async () => {
    const { DELETE } = await import('../tenants/[tenantId]/members.ts');
    queryOneMock.mockResolvedValueOnce({ owner_id: '11111111-1111-1111-1111-111111111111' });

    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members?user_id=11111111-1111-1111-1111-111111111111', {
      method: 'DELETE'
    });

    const response = await DELETE({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(409);
    expect(removeTenantMemberMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when provider config is incomplete', async () => {
    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'https://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id'
    });

    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(404);
    expect(createUserSessionMock).not.toHaveBeenCalled();
  });

  it('rejects stripe webhook without signature header', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    expect(verifyWebhookSignatureMock).not.toHaveBeenCalled();
  });

  it('accepts a valid stripe webhook and records delivery completion in payment-failed flow', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    queryOneMock.mockImplementation(async (sql: string) => (
      sql.includes('SELECT id, status FROM webhook_deliveries')
        ? { id: 'delivery-1', status: 'completed' }
        : null
    ));

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);
    const payloadText = await response.text();

    expect(response.status).toBe(200);
    expect(payloadText).toContain('"received":true');
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, status FROM webhook_deliveries'),
      ['evt_1']
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE webhook_deliveries"),
      [undefined, JSON.stringify({ received: true })]
    );
  });
});
