import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';

const getMessagesMock = vi.fn();
const getConversationsMock = vi.fn();
const getOrCreateConversationMock = vi.fn();
const sendMessageMock = vi.fn();
const markConversationReadMock = vi.fn();
const queryOneMock = vi.fn();
const queryMock = vi.fn();
const updateDbMock = vi.fn();
const isUserBlockedMock = vi.fn();
const deleteCacheMock = vi.fn();
const checkRateLimitMock = vi.fn();
const recordRequestMock = vi.fn();
const verifyWebhookSignatureMock = vi.fn();
const getSubscriptionMock = vi.fn();
const updateUserQuotasMock = vi.fn();
const emailOnSubscriptionCreatedMock = vi.fn();
const emailOnPaymentSuccessMock = vi.fn();
const emailOnSubscriptionCancelledMock = vi.fn();
const verifyOAuthStateMock = vi.fn();
const getOAuthProviderMock = vi.fn();
const generateOAuthStateMock = vi.fn();
const linkOAuthAccountMock = vi.fn();
const getOAuthAccountByProviderMock = vi.fn();
const createUserSessionMock = vi.fn();
const createTenantMock = vi.fn();
const getTenantBySlugMock = vi.fn();
const getTenantBrandingMock = vi.fn();
const updateTenantBrandingMock = vi.fn();
const getTenantMembersMock = vi.fn();
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
  getConversations: getConversationsMock,
  getOrCreateConversation: getOrCreateConversationMock,
  sendMessage: sendMessageMock,
  markConversationRead: markConversationReadMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryOne: queryOneMock,
  query: queryMock,
  insert: vi.fn(),
  update: updateDbMock,
}));

vi.mock('../../../lib/blocking', () => ({
  isUserBlocked: isUserBlockedMock,
}));

vi.mock('../../../lib/cache', () => ({
  deleteCache: deleteCacheMock,
  checkRateLimit: checkRateLimitMock,
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
  generateOAuthState: generateOAuthStateMock,
  linkOAuthAccount: linkOAuthAccountMock,
  getOAuthAccountByProvider: getOAuthAccountByProviderMock,
}));

vi.mock('../../../lib/security', () => ({
  createUserSession: createUserSessionMock,
}));

vi.mock('../../../lib/multi-tenant', () => ({
  createTenant: createTenantMock,
  getTenantBySlug: getTenantBySlugMock,
  getTenantBranding: getTenantBrandingMock,
  updateTenantBranding: updateTenantBrandingMock,
  getTenantMembers: getTenantMembersMock,
  addTenantMember: addTenantMemberMock,
  removeTenantMember: removeTenantMemberMock,
  logTenantAudit: logTenantAuditMock,
}));

describe('API contract hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    queryOneMock.mockResolvedValue(null);
    getConversationsMock.mockResolvedValue([]);
    getOrCreateConversationMock.mockResolvedValue({ id: 'conversation-1' });
    markConversationReadMock.mockResolvedValue(undefined);
    createTenantMock.mockResolvedValue({ id: 'tenant-1' });
    getTenantBySlugMock.mockResolvedValue(null);
    getTenantBrandingMock.mockResolvedValue(null);
    updateTenantBrandingMock.mockResolvedValue(true);
    getTenantMembersMock.mockResolvedValue([]);
    updateDbMock.mockResolvedValue({});
    isUserBlockedMock.mockResolvedValue(false);
    checkRateLimitMock.mockResolvedValue(true);
    addTenantMemberMock.mockResolvedValue({ id: 'member-1' });
    removeTenantMemberMock.mockResolvedValue(true);
    logTenantAuditMock.mockResolvedValue(undefined);
    verifyOAuthStateMock.mockResolvedValue(null);
    getOAuthProviderMock.mockResolvedValue(null);
    generateOAuthStateMock.mockResolvedValue('state-token');
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

  it('rejects unauthenticated messages GET before service calls', async () => {
    const { GET } = await import('../messages/[conversationId].ts');
    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111');

    const response = await GET({
      request,
      locals: {},
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(401);
    expect(getMessagesMock).not.toHaveBeenCalled();
  });

  it('rejects invalid inbox limit before listing conversations', async () => {
    const { GET } = await import('../messages/index.ts');
    const request = new Request('https://example.com/api/messages?limit=0');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(getConversationsMock).not.toHaveBeenCalled();
  });

  it('rejects invalid inbox offset before listing conversations', async () => {
    const { GET } = await import('../messages/index.ts');
    const request = new Request('https://example.com/api/messages?offset=-1');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(getConversationsMock).not.toHaveBeenCalled();
  });

  it('rejects non-json content type for inbox conversation create', async () => {
    const { POST } = await import('../messages/index.ts');
    const request = new Request('https://example.com/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(getOrCreateConversationMock).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON for inbox conversation create', async () => {
    const { POST } = await import('../messages/index.ts');
    const request = new Request('https://example.com/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(getOrCreateConversationMock).not.toHaveBeenCalled();
  });

  it('rejects invalid recipient id for inbox conversation create', async () => {
    const { POST } = await import('../messages/index.ts');
    const request = new Request('https://example.com/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'bad-recipient' })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(queryOneMock).not.toHaveBeenCalled();
    expect(getOrCreateConversationMock).not.toHaveBeenCalled();
  });

  it('rejects self-recipient conversation create', async () => {
    const { POST } = await import('../messages/index.ts');
    const request = new Request('https://example.com/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: '11111111-1111-1111-1111-111111111111' })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(409);
    expect(getOrCreateConversationMock).not.toHaveBeenCalled();
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

  it('maps unauthorized service access to forbidden in messages GET', async () => {
    const { GET } = await import('../messages/[conversationId].ts');
    getMessagesMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111');
    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(403);
  });

  it('rejects invalid before cursor for messages GET', async () => {
    const { GET } = await import('../messages/[conversationId].ts');
    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111?before=bad-cursor');

    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(400);
    expect(getMessagesMock).not.toHaveBeenCalled();
  });

  it('rejects invalid limit for messages GET', async () => {
    const { GET } = await import('../messages/[conversationId].ts');
    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111?limit=0');

    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(400);
    expect(getMessagesMock).not.toHaveBeenCalled();
  });

  it('clamps messages GET limit to maximum 100', async () => {
    const { GET } = await import('../messages/[conversationId].ts');
    getMessagesMock.mockResolvedValueOnce([]);

    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111?limit=999');
    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(200);
    expect(getMessagesMock).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      100,
      undefined
    );
  });

  it('rejects non-json content type for messages POST', async () => {
    const { POST } = await import('../messages/[conversationId].ts');
    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(400);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('rejects messages POST when sender is blocked by recipient', async () => {
    const { POST } = await import('../messages/[conversationId].ts');
    queryOneMock.mockResolvedValueOnce({
      id: '11111111-1111-1111-1111-111111111111',
      participant_a: '11111111-1111-1111-1111-111111111111',
      participant_b: '22222222-2222-2222-2222-222222222222'
    });
    isUserBlockedMock.mockResolvedValueOnce(true);

    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'test' })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(403);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('rejects invalid conversation id for mark-read endpoint', async () => {
    const { POST } = await import('../messages/[conversationId]/read.ts');
    const request = new Request('https://example.com/api/messages/not-a-uuid/read', { method: 'POST' });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: 'not-a-uuid' },
    } as any);

    expect(response.status).toBe(400);
    expect(markConversationReadMock).not.toHaveBeenCalled();
  });

  it('rejects mark-read when user has no access to conversation', async () => {
    const { POST } = await import('../messages/[conversationId]/read.ts');
    markConversationReadMock.mockRejectedValueOnce(new Error('Access denied'));

    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111/read', { method: 'POST' });
    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(response.status).toBe(403);
  });

  it('rejects non-json tenant create payload', async () => {
    const { POST } = await import('../tenants/index.ts');
    const request = new Request('https://example.com/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(createTenantMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tenant create JSON', async () => {
    const { POST } = await import('../tenants/index.ts');
    const request = new Request('https://example.com/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(createTenantMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tenant slug format on tenant create', async () => {
    const { POST } = await import('../tenants/index.ts');
    const request = new Request('https://example.com/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tenant A', slug: 'Bad Slug!' })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(422);
    expect(getTenantBySlugMock).not.toHaveBeenCalled();
    expect(createTenantMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tenant id before tenant detail lookup', async () => {
    const { GET } = await import('../tenants/[tenantId].ts');
    const request = new Request('https://example.com/api/tenants/not-a-uuid');

    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'not-a-uuid' },
    } as any);

    expect(response.status).toBe(400);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tenant id before tenant patch', async () => {
    const { PATCH } = await import('../tenants/[tenantId].ts');
    const request = new Request('https://example.com/api/tenants/not-a-uuid', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' })
    });

    const response = await PATCH({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'not-a-uuid' },
    } as any);

    expect(response.status).toBe(400);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('rejects non-json tenant patch payload', async () => {
    const { PATCH } = await import('../tenants/[tenantId].ts');
    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', {
      method: 'PATCH',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await PATCH({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any);

    expect(response.status).toBe(400);
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('rejects non-object branding in tenant patch payload', async () => {
    const { PATCH } = await import('../tenants/[tenantId].ts');
    queryOneMock.mockResolvedValueOnce({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      owner_id: '11111111-1111-1111-1111-111111111111',
      slug: 'tenant-a'
    });

    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ branding: 'invalid' })
    });

    const response = await PATCH({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any);

    expect(response.status).toBe(422);
    expect(updateDbMock).not.toHaveBeenCalled();
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

  it('rejects tenant members GET for non-owner non-member users', async () => {
    const { GET } = await import('../tenants/[tenantId]/members.ts');
    queryOneMock
      .mockResolvedValueOnce({ owner_id: '99999999-9999-9999-9999-999999999999' })
      .mockResolvedValueOnce(null);

    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members');
    const response = await GET({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any);

    expect(response.status).toBe(403);
  });

  it('rejects non-json tenant member POST body', async () => {
    const { POST } = await import('../tenants/[tenantId]/members.ts');
    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any);

    expect(response.status).toBe(400);
    expect(addTenantMemberMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tenant id before membership mutations', async () => {
    const { POST } = await import('../tenants/[tenantId]/members.ts');
    const request = new Request('https://example.com/api/tenants/not-a-uuid/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: '22222222-2222-2222-2222-222222222222',
        role: 'member'
      })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'not-a-uuid' },
    } as any);

    expect(response.status).toBe(400);
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

  it('returns not found when deleting a tenant member that does not exist', async () => {
    const { DELETE } = await import('../tenants/[tenantId]/members.ts');
    queryOneMock.mockResolvedValueOnce({ owner_id: '11111111-1111-1111-1111-111111111111' });
    removeTenantMemberMock.mockResolvedValueOnce(false);

    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members?user_id=22222222-2222-2222-2222-222222222222', {
      method: 'DELETE'
    });

    const response = await DELETE({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(404);
  });

  it('returns conflict when tenant member already exists', async () => {
    const { POST } = await import('../tenants/[tenantId]/members.ts');
    queryOneMock
      .mockResolvedValueOnce({ owner_id: '11111111-1111-1111-1111-111111111111' })
      .mockResolvedValueOnce({ id: '22222222-2222-2222-2222-222222222222' });
    addTenantMemberMock.mockResolvedValueOnce(null);

    const request = new Request('https://example.com/api/tenants/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: '22222222-2222-2222-2222-222222222222',
        role: 'member'
      })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any);

    expect(response.status).toBe(409);
  });

  it('rejects oauth authorize when provider key format is invalid', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    const request = new Request('https://example.com/api/auth/oauth/authorize?provider=bad key');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(getOAuthProviderMock).not.toHaveBeenCalled();
  });

  it('rate limits oauth authorize endpoint', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/auth/oauth/authorize?provider=google');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(429);
    expect(getOAuthProviderMock).not.toHaveBeenCalled();
  });

  it('rejects oauth authorize when redirect_uri is not same-origin', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    const request = new Request(
      'https://example.com/api/auth/oauth/authorize?provider=google&redirect_uri=https://evil.example/callback'
    );

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(getOAuthProviderMock).not.toHaveBeenCalled();
    expect(generateOAuthStateMock).not.toHaveBeenCalled();
  });

  it('completes oauth authorize redirect for valid provider and redirect_uri', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    getOAuthProviderMock.mockResolvedValueOnce({
      provider_key: 'google',
      client_id: 'client-id',
      auth_url: 'https://accounts.example.com/oauth/authorize',
      scope: 'openid email profile'
    });
    generateOAuthStateMock.mockResolvedValueOnce('state-xyz');

    const request = new Request(
      'https://example.com/api/auth/oauth/authorize?provider=google&redirect_uri=https://example.com/api/auth/oauth/callback'
    );
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') || '';
    expect(location.startsWith('https://accounts.example.com/oauth/authorize?')).toBe(true);
    expect(location).toContain('client_id=client-id');
    expect(location).toContain(`state=${encodeURIComponent('state-xyz')}`);
  });

  it('builds oauth provider authorize redirect only for valid same-origin redirect_uri', async () => {
    const { GET } = await import('../auth/oauth/[provider].ts');
    const request = new Request(
      'https://example.com/api/auth/oauth/google?redirect_uri=https://example.com/api/auth/oauth/callback'
    );

    const response = await GET({
      params: { provider: 'google' },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') || '';
    expect(location).toContain('/api/auth/oauth/authorize');
    expect(location).toContain('provider=google');
    expect(location).toContain(encodeURIComponent('https://example.com/api/auth/oauth/callback'));
  });

  it('rejects oauth provider redirect when redirect_uri is external', async () => {
    const { GET } = await import('../auth/oauth/[provider].ts');
    const request = new Request(
      'https://example.com/api/auth/oauth/google?redirect_uri=https://evil.example/callback'
    );

    const response = await GET({
      params: { provider: 'google' },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(400);
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

  it('rate limits oauth callback endpoint', async () => {
    const { GET } = await import('../auth/oauth/callback.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(429);
    expect(verifyOAuthStateMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when code or state is missing', async () => {
    const { GET } = await import('../auth/oauth/callback.ts');
    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(verifyOAuthStateMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when provider returns no email and no linked account exists', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'provider-user' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'https://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });

    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(linkOAuthAccountMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when token exchange fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'https://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });

    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(createUserSessionMock).not.toHaveBeenCalled();
  });

  it('completes oauth callback and sets non-secure cookie on http origin', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'provider-user',
        email: 'oauth@example.com',
        name: 'OAuth User'
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'http://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });
    queryOneMock.mockResolvedValueOnce({ id: '11111111-1111-1111-1111-111111111111' });

    const request = new Request('http://example.com/api/auth/oauth/callback?code=abc&state=state-1', {
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '127.0.0.1' }
    });
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    const setCookie = response.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('auth-token=session-token');
    expect(setCookie).not.toContain('Secure');
    expect(linkOAuthAccountMock).toHaveBeenCalled();
    expect(createUserSessionMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('sets secure cookie when request is behind https proxy', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'provider-user',
        email: 'oauth@example.com',
        name: 'OAuth User'
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'http://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });
    queryOneMock.mockResolvedValueOnce({ id: '11111111-1111-1111-1111-111111111111' });

    const request = new Request('http://example.com/api/auth/oauth/callback?code=abc&state=state-1', {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '127.0.0.1',
        'x-forwarded-proto': 'https'
      }
    });
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Set-Cookie') || '').toContain('Secure');

    vi.unstubAllGlobals();
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

  it('rejects stripe webhook when signature verification fails', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    verifyWebhookSignatureMock.mockRejectedValueOnce(new Error('invalid signature'));

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
  });

  it('returns duplicate response for already completed stripe delivery', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    queryOneMock.mockResolvedValueOnce({ id: 'delivery-1', status: 'completed' });

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ received: true, duplicate: true });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('accepts a valid stripe webhook and records delivery completion in payment-failed flow', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'delivery-1' });

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
      expect.stringContaining('SELECT id, status, retry_count, last_tried_at'),
      ['evt_1']
    );
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO webhook_deliveries'),
      ['invoice.payment_failed', 'evt_1', JSON.stringify({ id: 'evt_1' })]
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE webhook_deliveries"),
      ['delivery-1', JSON.stringify({ received: true })]
    );
  });

  it('processes customer.subscription.deleted and records cancellation flow', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    verifyWebhookSignatureMock.mockResolvedValueOnce({
      id: 'evt_sub_deleted',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_deleted_1' } }
    });
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'delivery-sub-1' })
      .mockResolvedValueOnce({ id: 'sub-1', user_id: '11111111-1111-1111-1111-111111111111', tier_id: 'tier-pro' });

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_sub_deleted' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    expect(updateDbMock).toHaveBeenCalledWith(
      'subscriptions',
      'sub-1',
      expect.objectContaining({ status: 'cancelled' })
    );
    expect(emailOnSubscriptionCancelledMock).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'tier-pro',
      expect.any(Date)
    );
  });

  it('keeps message delete idempotent for same participant conversation', async () => {
    const { DELETE } = await import('../messages/[conversationId].ts');
    queryOneMock.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      participant_a: '11111111-1111-1111-1111-111111111111',
      participant_b: '22222222-2222-2222-2222-222222222222'
    });

    const request = new Request('https://example.com/api/messages/11111111-1111-1111-1111-111111111111', {
      method: 'DELETE'
    });

    const responseA = await DELETE({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);
    const responseB = await DELETE({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
      params: { conversationId: '11111111-1111-1111-1111-111111111111' },
    } as any);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(deleteCacheMock).toHaveBeenCalledTimes(2);
  });

  it('defers retry when stripe delivery backoff window has not elapsed yet', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    queryOneMock.mockResolvedValueOnce({
      id: 'delivery-1',
      status: 'processing',
      retry_count: 1,
      last_tried_at: new Date().toISOString()
    });

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.received).toBe(true);
    expect(payload.data.duplicate).toBe(true);
    expect(payload.data.retryDelayed).toBe(true);
    expect(payload.data.retryAfterSeconds).toBeGreaterThan(0);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('retries an existing incomplete stripe delivery before completing it', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    queryOneMock.mockResolvedValueOnce({
      id: 'delivery-1',
      status: 'processing',
      retry_count: 1,
      last_tried_at: new Date(Date.now() - (3 * 60 * 1000)).toISOString()
    });

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'processing'"),
      ['delivery-1']
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'completed'"),
      ['delivery-1', JSON.stringify({ received: true })]
    );
  });

  it('stops retrying stripe delivery when retry budget is exhausted', async () => {
    const { POST } = await import('../webhooks/stripe.ts');
    queryOneMock.mockResolvedValueOnce({
      id: 'delivery-1',
      status: 'failed',
      retry_count: 8,
      last_tried_at: new Date(Date.now() - (20 * 60 * 1000)).toISOString()
    });

    const request = new Request('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.duplicate).toBe(true);
    expect(payload.data.retryDelayed).toBe(true);
    expect(payload.data.exhausted).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
