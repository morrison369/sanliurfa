import type Stripe from 'stripe';
import { insert, queryOne, update as updateDb } from './postgres';
import { getSubscription } from './stripe-client';
import { updateUserQuotas } from './usage-tracking';
import { logger } from './logging';
import { emailOnSubscriptionCreated, emailOnPaymentSuccess, emailOnSubscriptionCancelled } from './subscription-email-integration';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const userId = session.metadata?.userId;
    const tierId = session.metadata?.tierId;
    const billingCycle = session.metadata?.billingCycle || 'monthly';

    if (!userId || !tierId) {
      logger.warn('Invalid checkout session metadata', { sessionId: session.id });
      return;
    }

    if (!session.subscription || typeof session.subscription !== 'string') {
      logger.warn('No subscription ID in checkout session', { sessionId: session.id });
      return;
    }

    const stripeSubscription = await getSubscription(session.subscription);

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

    await updateUserQuotas(userId);

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

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  try {
    const subscriptionId = (invoice as any).subscription as string | null | undefined;

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      logger.warn('No subscription ID in invoice', { invoiceId: invoice.id });
      return;
    }

    const subscription = await queryOne(
      `SELECT id, user_id, billing_cycle, tier_id FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );

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

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  try {
    const stripeSubscriptionId = subscription.id;

    const dbSubscription = await queryOne(
      `SELECT id, user_id, tier_id FROM subscriptions WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );

    if (dbSubscription) {
      await updateDb('subscriptions', dbSubscription.id, {
        status: 'cancelled',
        end_date: new Date().toISOString(),
      });

      const accessUntilDate = new Date();
      accessUntilDate.setDate(accessUntilDate.getDate() + 30);
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

export async function processStripeWebhookBusinessEvent(event: Stripe.Event): Promise<void> {
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
        subscriptionId: ((event.data.object as Stripe.Invoice) as any).subscription,
      });
      break;

    default:
      logger.debug('Unhandled webhook event', { eventType: event.type });
  }
}
