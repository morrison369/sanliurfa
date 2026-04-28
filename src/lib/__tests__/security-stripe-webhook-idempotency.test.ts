/**
 * Security Test — Stripe Webhook Idempotency
 *
 * 2026-04-25 audit'inde `/api/webhooks/stripe.ts` idempotent değildi:
 * - `handleCheckoutSessionCompleted` duplicate event = duplicate subscription DB record
 * - `handleCustomerSubscriptionDeleted` duplicate = duplicate cancel email
 * - Outer POST handler error swallow → Stripe asla retry tetiklenmiyordu (lost financial events)
 *
 * CLAUDE.md "SECURITY HARD RULES" #7: Idempotency check zorunlu, 4xx vs 5xx ayrımı.
 *
 * Bu test:
 * 1. Duplicate checkout event → 2. çağrıda DB insert YAPILMAZ (skip)
 * 2. Duplicate cancel event → 2. çağrıda email YENİDEN gönderilmez
 * 3. Handler error → outer POST 500 döner (Stripe retry tetiklenir)
 * 4. Signature verification fail → 400 döner (Stripe retry yapmaz)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/postgres', () => ({
  queryOne: vi.fn(),
  insert: vi.fn().mockResolvedValue({ id: 'sub-1' }),
  update: vi.fn().mockResolvedValue({ id: 'sub-1' }),
}));

vi.mock('../../lib/stripe/stripe-client', () => ({
  verifyStripeWebhookSignature: vi.fn(),
  getSubscription: vi.fn().mockResolvedValue({
    id: 'sub_stripe_1',
    items: { data: [{ price: { unit_amount: 2999 } }] },
    currency: 'try',
    latest_invoice: 'inv_1',
  }),
}));

vi.mock('../../lib/usage/usage-tracking', () => ({
  updateUserQuotas: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/subscription/subscription-email-integration', () => ({
  emailOnSubscriptionCreated: vi.fn().mockResolvedValue(undefined),
  emailOnPaymentSuccess: vi.fn().mockResolvedValue(undefined),
  emailOnSubscriptionCancelled: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../lib/metrics', () => ({
  recordRequest: vi.fn(),
}));

import { verifyStripeWebhookSignature } from '../../lib/stripe/stripe-client';
import { queryOne, insert } from '../../lib/postgres';
import { emailOnSubscriptionCancelled } from '../../lib/subscription/subscription-email-integration';

function makeStripeRequest(body: object): Request {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test_valid' },
    body: JSON.stringify(body),
  });
}

describe('Stripe Webhook Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCheckoutSessionCompleted', () => {
    it('skips DB insert when stripe_subscription_id already exists (duplicate event)', async () => {
      const event = {
        id: 'evt_1', type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1', subscription: 'sub_stripe_1',
            customer: 'cus_1', customer_email: 'a@x.com',
            metadata: { userId: 'user-1', tierId: 'tier-1', billingCycle: 'monthly' },
          },
        },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);

      // existing active sub → null; atomic INSERT ON CONFLICT returns null on duplicate
      vi.mocked(queryOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      expect(response.status).toBe(200); // duplicate is OK, just skip
      expect(insert).not.toHaveBeenCalled(); // CRITICAL: no double-insert
    });

    it('proceeds with DB insert when subscription is new', async () => {
      const event = {
        id: 'evt_2', type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_2', subscription: 'sub_new',
            customer: 'cus_1', customer_email: 'a@x.com',
            metadata: { userId: 'user-1', tierId: 'tier-1', billingCycle: 'monthly' },
          },
        },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);

      // existingSub → null (no active sub), atomic subscription insert → new row
      vi.mocked(queryOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'sub-1', user_id: 'user-1', tier_id: 'tier-1' });

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      expect(response.status).toBe(200);
      // insert called for both subscriptions and billing_history
      expect(insert).toHaveBeenCalled();
    });
  });

  describe('handleCustomerSubscriptionDeleted', () => {
    it('skips email when subscription already cancelled (duplicate event)', async () => {
      const event = {
        id: 'evt_3', type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_stripe_1' } },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 'sub-uuid', user_id: 'user-1', tier_id: 'tier-1',
        status: 'cancelled', // already cancelled — duplicate event
      });

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      expect(response.status).toBe(200);
      // CRITICAL: no duplicate cancel email
      expect(emailOnSubscriptionCancelled).not.toHaveBeenCalled();
    });

    it('sends cancel email when subscription is active (first delete event)', async () => {
      const event = {
        id: 'evt_4', type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_stripe_1' } },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 'sub-uuid', user_id: 'user-1', tier_id: 'tier-1',
        status: 'active',
      });

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      expect(response.status).toBe(200);
      expect(emailOnSubscriptionCancelled).toHaveBeenCalledTimes(1);
    });

    it('returns 200 silently when subscription not found in DB (Stripe-only sub)', async () => {
      const event = {
        id: 'evt_5', type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_unknown' } },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);
      vi.mocked(queryOne).mockResolvedValueOnce(null);

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      expect(response.status).toBe(200);
      expect(emailOnSubscriptionCancelled).not.toHaveBeenCalled();
    });
  });

  describe('Outer POST handler 4xx vs 5xx semantics', () => {
    it('signature verification failure → 400 (Stripe will NOT retry)', async () => {
      vi.mocked(verifyStripeWebhookSignature).mockRejectedValue(new Error('Invalid signature'));

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({
        request: new Request('http://localhost/api/webhooks/stripe', {
          method: 'POST',
          headers: { 'stripe-signature': 'sig_invalid' },
          body: JSON.stringify({}),
        }),
      } as any);

      expect(response.status).toBe(400);
    });

    it('handler runtime error → 500 (Stripe WILL retry)', async () => {
      const event = {
        id: 'evt_err', type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_err', subscription: 'sub_err',
            metadata: { userId: 'user-1', tierId: 'tier-1', billingCycle: 'monthly' },
          },
        },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);
      // queryOne throws → simulates DB down
      vi.mocked(queryOne).mockRejectedValue(new Error('Database connection lost'));

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      // CRITICAL: 500 means Stripe retries; 200 means lost event
      expect(response.status).toBe(500);
    });

    it('unknown event type → 200 (no action, no retry needed)', async () => {
      const event = {
        id: 'evt_unknown', type: 'some.unknown.event',
        data: { object: {} },
      };
      vi.mocked(verifyStripeWebhookSignature).mockResolvedValue(event as any);

      const { POST } = await import('../../pages/api/webhooks/stripe');
      const response = await POST({ request: makeStripeRequest(event) } as any);

      expect(response.status).toBe(200);
    });
  });
});
