/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe events
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { insert, queryOne, update as updateDb } from '../../../lib/postgres';
import { verifyStripeWebhookSignature, getSubscription } from '../../../lib/stripe/stripe-client';
import { updateUserQuotas } from '../../../lib/usage/usage-tracking';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { emailOnSubscriptionCreated, emailOnPaymentSuccess, emailOnSubscriptionCancelled } from '../../../lib/subscription/subscription-email-integration';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId;
    const tierId = session.metadata?.tierId;
    const billingCycle = session.metadata?.billingCycle || 'monthly';

    if (!userId || !tierId) {
      logger.warn('Invalid checkout session metadata', new Error(`sessionId: ${session.id}`));
      return;
    }

    // Get subscription details from Stripe
    if (!session.subscription || typeof session.subscription !== 'string') {
      logger.warn('No subscription ID in checkout session', new Error(`sessionId: ${session.id}`));
      return;
    }

    const stripeSubscription = await getSubscription(session.subscription);

    // Cancel existing active subscription if any
    const existingSub = await queryOne(
      `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    if (existingSub) {
      await updateDb('subscriptions', existingSub.id, {
        status: 'cancelled',
        end_date: new Date().toISOString(),
      });
    }

    // Create new subscription — atomic INSERT ON CONFLICT (HARD RULE #47).
    // ON CONFLICT (stripe_subscription_id) DO NOTHING guarantees idempotency:
    // concurrent webhook retries both attempt INSERT; only one succeeds, the other
    // gets NULL back and returns early without duplicating side-effects (email, quota).
    const nextBillingDate = new Date();
    if (billingCycle === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const subscription = await queryOne<{ id: string; user_id: string; tier_id: string }>(
      `INSERT INTO subscriptions
         (user_id, tier_id, subscription_type, status, start_date, auto_renew, billing_cycle,
          stripe_customer_id, stripe_subscription_id, next_billing_date, created_at)
       VALUES ($1, $2, 'stripe', 'active', NOW(), true, $3, $4, $5, $6, NOW())
       ON CONFLICT (stripe_subscription_id) DO NOTHING
       RETURNING id, user_id, tier_id`,
      [userId, tierId, billingCycle, String(session.customer || session.customer_email || ''),
       session.subscription, nextBillingDate.toISOString()]
    );

    if (!subscription) {
      logger.info('Stripe checkout webhook duplicate — skipping (ON CONFLICT)', {
        sessionId: session.id,
        stripeSubscriptionId: session.subscription,
      });
      return;
    }

    // Create billing history record
    await insert('billing_history', {
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      amount: (stripeSubscription.items.data[0]?.price?.unit_amount || 0) / 100,
      currency: stripeSubscription.currency || 'try',
      billing_cycle: billingCycle,
      payment_status: 'paid',
      stripe_invoice_id: stripeSubscription.latest_invoice || null,
      invoice_number: `INV-${subscription.id.slice(0, 8).toUpperCase()}`,
      created_at: new Date().toISOString(),
    });

    // Update quotas for new subscription
    await updateUserQuotas(subscription.user_id);

    // Send subscription created email
    const amount = (stripeSubscription.items.data[0]?.price?.unit_amount || 0) / 100;
    await emailOnSubscriptionCreated(subscription.user_id, subscription.tier_id, billingCycle, amount);

    logger.info('Subscription created from checkout', {
      subscriptionId: subscription.id,
      userId,
      tierId,
      stripeSubscriptionId: session.subscription,
    });
  } catch (error) {
    logger.error('Failed to handle checkout session completed', error instanceof Error ? error : new Error(String(error)));
    // Re-throw: Stripe webhook outer catch 5xx döner → Stripe retry yapar.
    // Idempotency check (stripe_subscription_id duplicate) retry'da silent skip yapacak.
    throw error;
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  let subscription: { id: string; user_id: string; tier_id: string; billing_cycle?: string } | null = null;

  try {
    const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string | null }).subscription;

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      logger.warn('No subscription ID in invoice', new Error(`invoiceId: ${invoice.id}`));
      return;
    }

    subscription = await queryOne(
      `SELECT id, user_id, tier_id, billing_cycle FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );

    if (subscription) {
      // INSERT ON CONFLICT is atomic — prevents duplicate billing_history rows when Stripe
      // retries the webhook (concurrent delivery / retry race condition).
      await queryOne(
        `INSERT INTO billing_history
           (subscription_id, user_id, amount, currency, billing_cycle, payment_status,
            stripe_invoice_id, invoice_number, created_at)
         VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8)
         ON CONFLICT (stripe_invoice_id) DO UPDATE SET payment_status = 'paid'`,
        [
          subscription.id,
          subscription.user_id,
          invoice.amount_paid / 100,
          invoice.currency,
          invoice.billing_reason === 'subscription_cycle' ? 'monthly' : 'annual',
          invoice.id,
          invoice.number,
          new Date(invoice.created * 1000).toISOString(),
        ]
      );
    }

    // Send payment success email if we have subscription info
    if (subscription) {
      const nextBillingDate = new Date();
      if (subscription.billing_cycle === 'annual' || invoice.billing_reason === 'subscription_create') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }
      await emailOnPaymentSuccess(subscription.user_id, invoice.amount_paid / 100, subscription.tier_id, nextBillingDate);
    }

    logger.info('Invoice paid', { invoiceId: invoice.id });
  } catch (error) {
    logger.error('Failed to handle invoice paid', error instanceof Error ? error : new Error(String(error)));
    // Re-throw → Stripe retries; idempotency check (existingBilling by stripe_invoice_id) skip eder.
    throw error;
  }
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const stripeSubscriptionId = subscription.id;

    // Find subscription in our database — `status` ile idempotency check
    const dbSubscription = await queryOne<{ id: string; user_id: string; tier_id: string; status: string }>(
      `SELECT id, user_id, tier_id, status FROM subscriptions WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );

    if (!dbSubscription) {
      return;
    }

    // Idempotency: zaten cancelled ise duplicate webhook — skip (aksi halde duplicate cancel email).
    if (dbSubscription.status === 'cancelled') {
      logger.info('Stripe subscription delete webhook duplicate — skipping', {
        stripeSubscriptionId,
        dbId: dbSubscription.id,
      });
      return;
    }

    await updateDb('subscriptions', dbSubscription.id, {
      status: 'cancelled',
      end_date: new Date().toISOString(),
    });

    // Send subscription cancelled email
    const accessUntilDate = new Date();
    accessUntilDate.setDate(accessUntilDate.getDate() + 30); // Access for 30 more days
    await emailOnSubscriptionCancelled(dbSubscription.user_id, dbSubscription.tier_id, accessUntilDate);

    logger.info('Subscription cancelled', {
      subscriptionId: dbSubscription.id,
      userId: dbSubscription.user_id,
    });
  } catch (error) {
    logger.error('Failed to handle subscription deleted', error instanceof Error ? error : new Error(String(error)));
    // Re-throw → Stripe retries; status === 'cancelled' check ile retry'da silent skip eder.
    throw error;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  // Step 1: Verify signature — failure 400 (no Stripe retry, request was tampered)
  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    event = await verifyStripeWebhookSignature(rawBody, signature || '');
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/webhooks/stripe', 400, duration);
    logger.error('Webhook signature verification failed', error instanceof Error ? error : new Error(String(error)));
    return problemJson({
      status: 400,
      title: 'Webhook Doğrulanamadı',
      detail: 'Webhook signature verification failed',
      type: '/problems/webhook-stripe-signature-invalid',
      instance: '/api/webhooks/stripe',
    });
  }

  logger.info('Stripe webhook received', new Error(`eventType: ${event.type}, eventId: ${event.id}`));

  // Step 2: Handler dispatch — failure 5xx (Stripe retry tetiklenir; idempotency check'ler safe yapar)
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        const inv = event.data.object as Stripe.Invoice;
        logger.warn('Invoice payment failed', new Error(`invoiceId: ${inv.id}, subscriptionId: ${(inv as Stripe.Invoice & { subscription?: string }).subscription}`));
        break;

      default:
        logger.debug('Unhandled webhook event', new Error(`eventType: ${event.type}`));
    }

    recordRequest('POST', '/api/webhooks/stripe', 200, Date.now() - startTime);
    return apiResponse({ received: true }, HttpStatus.OK);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/webhooks/stripe', 500, duration);
    logger.error('Stripe webhook handler failed — Stripe will retry', error instanceof Error ? error : new Error(String(error)), { eventId: event.id, eventType: event.type });
    return problemJson({
      status: 500,
      title: 'Webhook İşlenemedi',
      detail: 'Internal handler failure — Stripe will retry',
      type: '/problems/webhook-stripe-handler-failed',
      instance: '/api/webhooks/stripe',
    });
  }
};
