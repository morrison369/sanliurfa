import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';

const queryOneMock = vi.fn();
const queryMock = vi.fn();
const updateDbMock = vi.fn();
const checkRateLimitMock = vi.fn();
const recordRequestMock = vi.fn();
const verifyWebhookSignatureMock = vi.fn();
const getSubscriptionMock = vi.fn();
const verifyBillingWebhookSignatureMock = vi.fn();
const handleBillingWebhookEventMock = vi.fn();
const updateUserQuotasMock = vi.fn();
const emailOnSubscriptionCreatedMock = vi.fn();
const emailOnPaymentSuccessMock = vi.fn();
const emailOnSubscriptionCancelledMock = vi.fn();
const requestEventReplayMock = vi.fn();
const getReplayHistoryMock = vi.fn();
const cancelReplayMock = vi.fn();
const retryFailedWebhooksMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../../lib/postgres', () => ({
  queryOne: queryOneMock,
  query: queryMock,
  pool: { query: queryMock },
  insert: vi.fn(),
  update: updateDbMock,
}));

vi.mock('../../../lib/cache', () => ({
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

vi.mock('../../../lib/stripe', () => ({
  verifyWebhookSignature: verifyBillingWebhookSignatureMock,
  handleWebhookEvent: handleBillingWebhookEventMock,
}));

vi.mock('../../../lib/usage-tracking', () => ({
  updateUserQuotas: updateUserQuotasMock,
}));

vi.mock('../../../lib/subscription-email-integration', () => ({
  emailOnSubscriptionCreated: emailOnSubscriptionCreatedMock,
  emailOnPaymentSuccess: emailOnPaymentSuccessMock,
  emailOnSubscriptionCancelled: emailOnSubscriptionCancelledMock,
}));

vi.mock('../../../lib/webhook-replay', () => ({
  requestEventReplay: requestEventReplayMock,
  getReplayHistory: getReplayHistoryMock,
  cancelReplay: cancelReplayMock,
}));

vi.mock('../../../lib/webhook-analytics', () => ({
  retryFailedWebhooks: retryFailedWebhooksMock,
}));

describe('Webhook API contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    queryOneMock.mockResolvedValue(null);
    updateDbMock.mockResolvedValue({});
    checkRateLimitMock.mockResolvedValue(true);
    requestEventReplayMock.mockResolvedValue({
      id: 'replay-1',
      webhookId: 'webhook-1',
      eventId: 'event-1',
      status: 'pending',
      eventType: 'invoice.payment_failed',
      eventData: {},
      requestedAt: new Date().toISOString()
    });
    getReplayHistoryMock.mockResolvedValue([]);
    cancelReplayMock.mockResolvedValue(true);
    verifyWebhookSignatureMock.mockResolvedValue({
      id: 'evt_1',
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_1', subscription: 'sub_1' } }
    });
    verifyBillingWebhookSignatureMock.mockReturnValue({ id: 'evt_bill_1', type: 'invoice.payment_failed' });
    handleBillingWebhookEventMock.mockResolvedValue(true);
    retryFailedWebhooksMock.mockResolvedValue(0);
    getSubscriptionMock.mockResolvedValue({ items: { data: [] }, currency: 'try', latest_invoice: null });
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

  it('rejects billing webhook without signature header', async () => {
    const { POST } = await import('../billing/webhook.ts');
    const request = new Request('https://example.com/api/billing/webhook', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    expect(verifyBillingWebhookSignatureMock).not.toHaveBeenCalled();
  });

  it('rejects billing webhook when signature verification fails', async () => {
    const { POST } = await import('../billing/webhook.ts');
    verifyBillingWebhookSignatureMock.mockReturnValueOnce(null);
    const request = new Request('https://example.com/api/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(401);
    expect(handleBillingWebhookEventMock).not.toHaveBeenCalled();
  });

  it('returns server error when billing webhook event handling fails', async () => {
    const { POST } = await import('../billing/webhook.ts');
    handleBillingWebhookEventMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify({ id: 'evt_1' })
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
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

  it('rejects webhook replay POST when content-type is not json', async () => {
    const { POST } = await import('../webhooks/replay.ts');
    const request = new Request('https://example.com/api/webhooks/replay', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'noop'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(requestEventReplayMock).not.toHaveBeenCalled();
  });

  it('rate limits webhook replay POST endpoint', async () => {
    const { POST } = await import('../webhooks/replay.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/webhooks/replay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ webhookId: 'webhook-1', eventId: 'event-1' })
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(429);
    expect(requestEventReplayMock).not.toHaveBeenCalled();
  });

  it('rejects webhook retry POST when content-type is not json', async () => {
    const { POST } = await import('../webhooks/retry.ts');
    const request = new Request('https://example.com/api/webhooks/retry', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'noop'
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rate limits webhook retry POST endpoint', async () => {
    const { POST } = await import('../webhooks/retry.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/webhooks/retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST({
      request,
      locals: { user: { id: '11111111-1111-1111-1111-111111111111' } },
    } as any);

    expect(response.status).toBe(429);
    expect(queryMock).not.toHaveBeenCalled();
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
