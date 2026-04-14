/**
 * Stripe Client Library
 * Initialize and manage Stripe API interactions
 */

import Stripe from 'stripe';
import { logger } from '../logger';
import { getEnv } from '../env';

let stripeClient: Stripe | null = null;

/**
 * Get or initialize Stripe client
 */
export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  // @ts-expect-error - getEnv signature mismatch
  const secretKey = getEnv('STRIPE_SECRET_KEY') as any;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  stripeClient = new Stripe(secretKey as string, {
    apiVersion: '2024-06-20',
  });

  return stripeClient;
}

/**
 * Create a checkout session for subscription upgrade
 */
export async function createCheckoutSession(params: {
  userId: string;
  tierId: string;
  tierName: string;
  tierPrice: number;
  billingCycle: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<{ id: string; url: string | null }> {
  try {
    const stripe = getStripeClient();

    // Determine price based on billing cycle
    const isAnnual = params.billingCycle === 'annual';
    const priceAmount = isAnnual ? params.tierPrice * 12 : params.tierPrice;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try', // Turkish Lira
            product_data: {
              name: params.tierName,
              description: `${params.tierName} Plan - Şanlıurfa`,
            },
            unit_amount: Math.round(priceAmount * 100), // Convert to cents
            recurring: {
              interval: isAnnual ? 'year' : 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: params.customerEmail,
      metadata: {
        userId: params.userId,
        tierId: params.tierId,
        tierName: params.tierName,
        billingCycle: params.billingCycle,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        metadata: {
          userId: params.userId,
          tierId: params.tierId,
          billingCycle: params.billingCycle,
        },
      },
    } as any);

    logger.info('Checkout session created', {
      sessionId: session.id,
      userId: params.userId,
      tierId: params.tierId,
    } as any);

    return {
      id: session.id,
      url: session.url,
    };
  } catch (error) {
    logger.error('Failed to create checkout session', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Get checkout session details
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  try {
    const stripe = getStripeClient();
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    logger.error('Failed to get checkout session', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    logger.error('Failed to get subscription', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediate,
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Create invoice
 */
export async function getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  try {
    const stripe = getStripeClient();
    return await stripe.invoices.retrieve(invoiceId);
  } catch (error) {
    logger.error('Failed to get invoice', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export async function verifyStripeWebhookSignature(body: string, signature: string | string[] | undefined): Promise<Stripe.Event> {
  try {
    const stripe = getStripeClient();
    // @ts-expect-error - getEnv signature mismatch
    const webhookSecret = getEnv('STRIPE_WEBHOOK_SECRET') as any;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    const signatureStr = Array.isArray(signature) ? signature[0] : signature;
    if (!signatureStr) {
      throw new Error('No signature provided');
    }

    const event = stripe.webhooks.constructEvent(body, signatureStr, webhookSecret as string);
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Get customer's subscriptions
 */
export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  try {
    const stripe = getStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    return subscriptions.data;
  } catch (error) {
    logger.error('Failed to get customer subscriptions', error instanceof Error ? error : new Error(String(error)), {} as any);
    throw error;
  }
}

/**
 * Get invoice PDF URL
 */
export async function getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
  try {
    const stripe = getStripeClient();
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf;
  } catch (error) {
    logger.error('Failed to get invoice PDF', error instanceof Error ? error : new Error(String(error)), {} as any);
    return null;
  }
}
