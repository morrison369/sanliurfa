/**
 * Stripe Payment Integration
 */

import Stripe from 'stripe';
import { pool } from './postgres';
import { logger } from './logging';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY not configured');
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

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
    if (!stripe) return null;

    const membershipResult = await pool.query(
      `SELECT stripe_customer_id FROM memberships WHERE user_id = $1`,
      [userId]
    );

    let customerId = membershipResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
      customerId = await createStripeCustomer(userId, userResult.rows[0]?.email);
    }

    if (!customerId) {
      throw new Error('Failed to create customer');
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expansion: ['latest_invoice.payment_intent']
    });

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
        const metadata = subscription.metadata;
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
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event | null {
  try {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) return null;
    return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.error('Webhook verification failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
