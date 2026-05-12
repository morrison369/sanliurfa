/**
 * Stripe Payment Integration
 *
 * Credentials are resolved through `getStripeConfig()` (site_settings → env fallback, 60s cache),
 * so admin can rotate keys via /admin/integrations without a server restart.
 */

import Stripe from 'stripe';
import { pool } from '../postgres';
import { logger } from '../logger';
import { getStripeConfig } from './stripe-config';

let _stripeClient: Stripe | null = null;
let _stripeClientKey: string | null = null;

async function getStripe(): Promise<Stripe | null> {
  const cfg = await getStripeConfig();
  if (!cfg.secret_key) return null;

  // Re-initialize if the key was rotated.
  if (_stripeClient && _stripeClientKey === cfg.secret_key) return _stripeClient;
  _stripeClient = new Stripe(cfg.secret_key, { apiVersion: '2026-04-22.dahlia' });
  _stripeClientKey = cfg.secret_key;
  return _stripeClient;
}

export const PRICING = {
  premium: {
    name: 'Premium',
    price: 299,
    currency: 'usd',
    interval: 'month'
  },
  pro: {
    name: 'Pro',
    price: 599,
    currency: 'usd',
    interval: 'month'
  }
};

/**
 * Create Stripe customer for user
 */
export async function createStripeCustomer(userId: string, email: string): Promise<string | null> {
  try {
    const stripe = await getStripe();
    if (!stripe) return null;

    const customer = await stripe.customers.create({ email });

    await pool.query(
      `UPDATE memberships SET stripe_customer_id = $1 WHERE user_id = $2`,
      [customer.id, userId]
    );

    logger.info('Stripe customer created', { userId, customerId: customer.id });
    return customer.id;
  } catch (error) {
    logger.error('Create customer failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Create subscription
 */
export async function createSubscription(
  userId: string,
  priceId: string,
  tier: 'premium' | 'pro'
): Promise<{ subscriptionId: string; clientSecret: string } | null> {
  try {
    const stripe = await getStripe();
    if (!stripe) return null;

    const membershipResult = await pool.query(
      `SELECT stripe_customer_id FROM memberships WHERE user_id = $1`,
      [userId]
    );

    let customerId = membershipResult?.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
      customerId = await createStripeCustomer(userId, userResult?.rows[0]?.email);
    }

    if (!customerId) {
      throw new Error('Failed to create customer');
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    } as any);

    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
    const clientSecret = paymentIntent?.client_secret;

    await pool.query(
      `UPDATE memberships SET tier = $1, status = 'active', started_at = NOW()
       WHERE user_id = $2`,
      [tier, userId]
    );

    logger.info('Subscription created', { userId, subscriptionId: subscription.id });

    return {
      subscriptionId: subscription.id,
      clientSecret: clientSecret || ''
    };
  } catch (error) {
    logger.error('Create subscription failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Handle webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
  try {
    switch (event.type) {
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Update membership status based on subscription status
        logger.info('Subscription updated', { subscriptionId: subscription.id });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Downgrade user to free tier
        await pool.query(
          `UPDATE memberships SET tier = 'free', status = 'cancelled'
           WHERE stripe_customer_id = $1`,
          [subscription.customer]
        );
        logger.info('Subscription cancelled', { subscriptionId: subscription.id });
        break;
      }
      case 'payment_intent.succeeded': {
        logger.info('Payment succeeded', { event: event.id });
        break;
      }
    }
    return true;
  } catch (error) {
    logger.error('Webhook handling failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Verify webhook signature
 */
export async function createStripeRefund(params: {
  payment_intent?: string;
  charge?: string;
  amount: number;
}): Promise<boolean> {
  const stripe = await getStripe();
  if (!stripe) return false;
  await stripe.refunds.create(params as Stripe.RefundCreateParams);
  return true;
}

export async function verifyWebhookSignature(body: string, signature: string): Promise<Stripe.Event | null> {
  try {
    const stripe = await getStripe();
    const cfg = await getStripeConfig();
    if (!stripe || !cfg.webhook_secret) return null;
    return stripe.webhooks.constructEvent(body, signature, cfg.webhook_secret);
  } catch (error) {
    logger.error('Webhook verification failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}


