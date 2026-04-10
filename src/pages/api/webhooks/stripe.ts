/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe events
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { insert, queryOne, query, update as updateDb } from '../../../lib/postgres';
import { verifyWebhookSignature, getSubscription } from '../../../lib/stripe-client';
import { updateUserQuotas } from '../../../lib/usage-tracking';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { emailOnSubscriptionCreated, emailOnPaymentSuccess, emailOnSubscriptionCancelled } from '../../../lib/subscription-email-integration';
import { apiError, apiResponse, ErrorCode, HttpStatus, getRequestId } from '../../../lib/api';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId;
    const tierId = session.metadata?.tierId;
    const billingCycle = session.metadata?.billingCycle || 'monthly';

    if (!userId || !tierId) {
      logger.warn('Invalid checkout session metadata', { sessionId: session.id });
      return;
    }

    // Get subscription details from Stripe
    if (!session.subscription || typeof session.subscription !== 'string') {
      logger.warn('No subscription ID in checkout session', { sessionId: session.id });
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

    // Create new subscription
    const nextBillingDate = new Date();
    if (billingCycle === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const subscription = await insert('subscriptions', {
      user_id: userId,
      tier_id: tierId,
      subscription_type: 'stripe',
      status: 'active',
      start_date: new Date().toISOString(),
      auto_renew: true,
      billing_cycle: billingCycle,
      stripe_customer_id: session.customer || session.customer_email,
      stripe_subscription_id: session.subscription,
      next_billing_date: nextBillingDate.toISOString(),
      created_at: new Date().toISOString(),
    });

    // Create billing history record
    await insert('billing_history', {
      subscription_id: subscription.id,
      user_id: userId,
      amount: (stripeSubscription.items.data[0]?.price?.unit_amount || 0) / 100,
      currency: stripeSubscription.currency || 'try',
      billing_cycle: billingCycle,
      payment_status: 'paid',
      stripe_invoice_id: stripeSubscription.latest_invoice || null,
      invoice_number: `INV-${subscription.id.slice(0, 8).toUpperCase()}`,
      created_at: new Date().toISOString(),
    });

    // Update quotas for new subscription
    await updateUserQuotas(userId);

    // Send subscription created email
    const amount = (stripeSubscription.items.data[0]?.price?.unit_amount || 0) / 100;
    await emailOnSubscriptionCreated(userId, tierId, billingCycle, amount);

    logger.info('Subscription created from checkout', {
      subscriptionId: subscription.id,
      userId,
      tierId,
      stripeSubscriptionId: session.subscription,
    });
  } catch (error) {
    logger.error('Failed to handle checkout session completed', error instanceof Error ? error : new Error(String(error)));
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription;

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      logger.warn('No subscription ID in invoice', { invoiceId: invoice.id });
      return;
    }

    const subscription = await queryOne(
      `SELECT id, user_id, billing_cycle, tier_id FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );

    // Update billing history
    const existingBilling = await queryOne(
      `SELECT id FROM billing_history WHERE stripe_invoice_id = $1`,
      [invoice.id]
    );

    if (!existingBilling) {
      if (subscription) {
        await insert('billing_history', {
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          billing_cycle: invoice.billing_reason === 'subscription_cycle' ? 'monthly' : 'annual',
          payment_status: 'paid',
          stripe_invoice_id: invoice.id,
          invoice_number: invoice.number,
          created_at: new Date(invoice.created * 1000).toISOString(),
        });
      }
    } else {
      await updateDb('billing_history', existingBilling.id, {
        payment_status: 'paid',
      });
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
  }
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const stripeSubscriptionId = subscription.id;

    // Find and cancel subscription in our database
    const dbSubscription = await queryOne(
      `SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );

    if (dbSubscription) {
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
    }
  } catch (error) {
    logger.error('Failed to handle subscription deleted', error instanceof Error ? error : new Error(String(error)));
  }
}

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/webhooks/stripe', HttpStatus.BAD_REQUEST, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing stripe-signature header',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(rawBody, signature);
    const existingDelivery = await queryOne(
      `SELECT id, status FROM webhook_deliveries WHERE stripe_event_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [event.id]
    );

    if (existingDelivery?.status === 'completed') {
      recordRequest('POST', '/api/webhooks/stripe', HttpStatus.OK, Date.now() - startTime);
      logger.info('Duplicate Stripe webhook ignored', { eventType: event.type, eventId: event.id });
      return apiResponse({ received: true, duplicate: true }, HttpStatus.OK, requestId);
    }

    const delivery = existingDelivery || await queryOne(
      `INSERT INTO webhook_deliveries (event_type, stripe_event_id, payload, status, last_tried_at)
       VALUES ($1, $2, $3::jsonb, 'processing', NOW())
       RETURNING id`,
      [event.type, event.id, rawBody]
    );

    if (existingDelivery?.id) {
      await query(
        `UPDATE webhook_deliveries
         SET status = 'processing', retry_count = COALESCE(retry_count, 0) + 1, last_tried_at = NOW()
         WHERE id = $1`,
        [existingDelivery.id]
      );
    }

    recordRequest('POST', '/api/webhooks/stripe', 200, Date.now() - startTime);
    logger.info('Stripe webhook received', { eventType: event.type, eventId: event.id });

    // Handle different event types
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
        logger.warn('Invoice payment failed', {
          invoiceId: (event.data.object as Stripe.Invoice).id,
          subscriptionId: (event.data.object as Stripe.Invoice).subscription,
        });
        break;

      default:
        logger.debug('Unhandled webhook event', { eventType: event.type });
    }

    await query(
      `UPDATE webhook_deliveries
       SET status = 'completed', http_status = 200, response_body = $2, completed_at = NOW()
       WHERE id = $1`,
      [delivery.id, JSON.stringify({ received: true })]
    );

    return apiResponse({ received: true }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/webhooks/stripe', 400, duration);
    logger.error('Webhook verification failed', error instanceof Error ? error : new Error(String(error)));

    return apiError(
      ErrorCode.AUTH_ERROR,
      'Webhook signature verification failed',
      HttpStatus.BAD_REQUEST,
      undefined,
      requestId
    );
  }
};
