/**
 * API Contract Tests - POST /api/billing/checkout
 *
 * - PHASE1_FREE_MODE early return (checkoutDisabled true)
 * - Auth required → 401
 * - Validation: tier (premium|pro), priceId required
 * - User lookup → 404 if not found
 * - createSubscription helper called + 200
 * - createSubscription returns null → 500
 * - Catch error → 500 (no raw message leak)
 *
 * vi.hoisted - stripe + postgres + metrics + phase-policy mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { createSubscriptionMock, queryOneMock, recordRequestMock, phase1FreeModeRef } = vi.hoisted(() => ({
  createSubscriptionMock: vi.fn(),
  queryOneMock: vi.fn(),
  recordRequestMock: vi.fn(),
  phase1FreeModeRef: { value: false },
}));

vi.mock('../stripe', () => ({
  createSubscription: createSubscriptionMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../runtime/phase-policy', () => ({
  get PHASE1_FREE_MODE() { return phase1FreeModeRef.value; },
}));

beforeEach(() => {
  createSubscriptionMock.mockReset();
  queryOneMock.mockReset();
  recordRequestMock.mockReset();
  phase1FreeModeRef.value = false;
});

import { POST } from '../../pages/api/billing/checkout';

const validBody = { tier: 'premium', priceId: 'price_test_123' };
const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

describe('POST /api/billing/checkout', () => {
  it('PHASE1_FREE_MODE → 200 + checkoutDisabled (no auth required)', async () => {
    phase1FreeModeRef.value = true;
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    const data = await parseJson(resp);
    expect(data.data.phase1FreeMode).toBe(true);
    expect(data.data.checkoutDisabled).toBe(true);
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it('no auth → 401', async () => {
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it('invalid tier → 422 validation error', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { tier: 'enterprise', priceId: 'p1' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('missing priceId → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { tier: 'premium' },
      locals: { user: authedUser },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('user not in DB → 404', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(404);
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it('valid - createSubscription called with userId/priceId/tier + 200', async () => {
    queryOneMock.mockResolvedValueOnce({ email: 'u@t.com' });
    createSubscriptionMock.mockResolvedValueOnce({ id: 'sub_1', status: 'active' });
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(createSubscriptionMock).toHaveBeenCalledWith('user-1', 'price_test_123', 'premium');
  });

  it('createSubscription returns null → 500', async () => {
    queryOneMock.mockResolvedValueOnce({ email: 'u@t.com' });
    createSubscriptionMock.mockResolvedValueOnce(null);
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });

  it('createSubscription throws → 500 (no raw message leak)', async () => {
    queryOneMock.mockResolvedValueOnce({ email: 'u@t.com' });
    createSubscriptionMock.mockRejectedValueOnce(new Error('Stripe API key invalid sk_live_xxx'));
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
    const data = await parseJson(resp);
    expect(JSON.stringify(data)).not.toContain('sk_live_xxx'); // sanitized
  });

  it('recordRequest called for metrics on every path', async () => {
    queryOneMock.mockResolvedValueOnce({ email: 'u@t.com' });
    createSubscriptionMock.mockResolvedValueOnce({ id: 'sub_1' });
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: authedUser } });
    await POST(ctx);
    expect(recordRequestMock).toHaveBeenCalled();
    expect(recordRequestMock.mock.calls[0][0]).toBe('POST');
    expect(recordRequestMock.mock.calls[0][1]).toBe('/api/billing/checkout');
  });
});
