import { logger } from '../logging';
/**
 * Payment service with Stripe and iyzico support
 * Multi-currency, subscriptions, and refunds
 */

// Payment provider configuration
const PAYMENT_CONFIG = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  iyzico: {
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
  },
  currency: process.env.DEFAULT_CURRENCY || 'TRY',
};

// Payment status
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

// Payment method
export type PaymentMethod = 
  | 'card'
  | 'bank_transfer'
  | 'wallet'
  | 'paypal'
  | 'crypto';

// Payment data
export interface PaymentData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  provider: 'stripe' | 'iyzico' | 'mock';
  providerPaymentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Subscription data
export interface SubscriptionData {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId?: string;
  metadata?: Record<string, any>;
}

// Payment intent
export interface PaymentIntent {
  clientSecret: string;
  paymentId: string;
  amount: number;
  currency: string;
}

// In-memory store (use database in production)
const paymentStore: Map<string, PaymentData> = new Map();
const subscriptionStore: Map<string, SubscriptionData> = new Map();

// Current provider
let currentProvider: 'stripe' | 'iyzico' | 'mock' = 'mock';

/**
 * Initialize payment service
 */
export function initPaymentService(): void {
  if (PAYMENT_CONFIG.stripe.secretKey) {
    currentProvider = 'stripe';
    logger.info('[Payment] Using Stripe provider');
  } else if (PAYMENT_CONFIG.iyizico.apiKey && PAYMENT_CONFIG.iyizico.secretKey) {
    currentProvider = 'iyzico';
    logger.info('[Payment] Using iyzico provider');
  } else {
    currentProvider = 'mock';
    logger.info('[Payment] Using mock provider');
  }
}

/**
 * Create payment intent
 */
export async function createPaymentIntent(
  userId: string,
  amount: number,
  currency: string = PAYMENT_CONFIG.currency,
  description: string = '',
  metadata?: Record<string, any>
): Promise<PaymentIntent> {
  const paymentId = generatePaymentId();

  switch (currentProvider) {
    case 'stripe':
      return createStripePaymentIntent(paymentId, amount, currency, description, metadata);
    case 'iyzico':
      return createIyzicoPaymentIntent(paymentId, amount, currency, description, metadata);
    case 'mock':
    default:
      return createMockPaymentIntent(paymentId, amount, currency);
  }
}

/**
 * Create Stripe payment intent
 */
async function createStripePaymentIntent(
  paymentId: string,
  amount: number,
  currency: string,
  description: string,
  metadata?: Record<string, any>
): Promise<PaymentIntent> {
  // In production:
  // const stripe = require('stripe')(PAYMENT_CONFIG.stripe.secretKey);
  // const intent = await stripe.paymentIntents.create({
  //   amount: Math.round(amount * 100), // Convert to cents
  //   currency: currency.toLowerCase(),
  //   description,
  //   metadata: { paymentId, ...metadata },
  // });
  // return { clientSecret: intent.client_secret!, paymentId, amount, currency };

  logger.info('[Payment] Stripe intent created:', { paymentId, amount, currency });
  return {
    clientSecret: `mock_secret_${paymentId}`,
    paymentId,
    amount,
    currency,
  };
}

/**
 * Create iyzico payment intent
 */
async function createIyzicoPaymentIntent(
  paymentId: string,
  amount: number,
  currency: string,
  description: string,
  metadata?: Record<string, any>
): Promise<PaymentIntent> {
  // In production, use iyzipay npm package
  logger.info('[Payment] iyzico intent created:', { paymentId, amount, currency });
  return {
    clientSecret: `mock_secret_${paymentId}`,
    paymentId,
    amount,
    currency,
  };
}

/**
 * Create mock payment intent
 */
async function createMockPaymentIntent(
  paymentId: string,
  amount: number,
  currency: string
): Promise<PaymentIntent> {
  return {
    clientSecret: `mock_secret_${paymentId}`,
    paymentId,
    amount,
    currency,
  };
}

/**
 * Confirm payment
 */
export async function confirmPayment(
  paymentId: string,
  paymentMethodId?: string
): Promise<PaymentData> {
  const payment = paymentStore.get(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  // In production, confirm with provider
  payment.status = 'completed';
  payment.updatedAt = new Date().toISOString();
  paymentStore.set(paymentId, payment);

  return payment;
}

/**
 * Create subscription
 */
export async function createSubscription(
  userId: string,
  planId: string,
  planName: string,
  price: number,
  interval: 'month' | 'year' = 'month',
  metadata?: Record<string, any>
): Promise<SubscriptionData> {
  const subscriptionId = generateSubscriptionId();

  const now = new Date();
  const periodEnd = new Date();
  if (interval === 'month') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const subscription: SubscriptionData = {
    id: subscriptionId,
    userId,
    planId,
    planName,
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    metadata,
  };

  subscriptionStore.set(subscriptionId, subscription);
  return subscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<SubscriptionData> {
  const subscription = subscriptionStore.get(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (immediate) {
    subscription.status = 'cancelled';
  } else {
    subscription.cancelAtPeriodEnd = true;
  }

  subscriptionStore.set(subscriptionId, subscription);
  return subscription;
}

/**
 * Process refund
 */
export async function processRefund(
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<PaymentData> {
  const payment = paymentStore.get(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }

  const refundAmount = amount || payment.amount;

  // In production, process refund with provider
  logger.info('[Payment] Refund processed:', { paymentId, amount: refundAmount, reason });

  payment.status = 'refunded';
  payment.updatedAt = new Date().toISOString();
  paymentStore.set(paymentId, payment);

  return payment;
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string): Promise<PaymentData | null> {
  return paymentStore.get(paymentId) || null;
}

/**
 * Get user payments
 */
export async function getUserPayments(userId: string): Promise<PaymentData[]> {
  return Array.from(paymentStore.values())
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get user subscriptions
 */
export async function getUserSubscriptions(userId: string): Promise<SubscriptionData[]> {
  return Array.from(subscriptionStore.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.currentPeriodStart).getTime() - new Date(a.currentPeriodStart).getTime());
}

/**
 * Handle webhook (Stripe/iyzico)
 */
export async function handleWebhook(
  provider: 'stripe' | 'iyzico',
  payload: any,
  signature: string
): Promise<void> {
  logger.info('[Payment] Webhook received:', { provider, event: payload.type });

  switch (payload.type) {
    case 'payment_intent.succeeded':
      // Update payment status
      break;
    case 'payment_intent.payment_failed':
      // Handle failed payment
      break;
    case 'invoice.paid':
      // Handle subscription renewal
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      break;
  }
}

/**
 * Get payment stats
 */
export function getPaymentStats(): {
  totalPayments: number;
  totalAmount: number;
  byStatus: Record<PaymentStatus, number>;
  byProvider: Record<string, number>;
} {
  const byStatus: Record<PaymentStatus, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
    cancelled: 0,
  };

  const byProvider: Record<string, number> = {
    stripe: 0,
    iyzico: 0,
    mock: 0,
  };

  let totalAmount = 0;

  for (const payment of paymentStore.values()) {
    byStatus[payment.status]++;
    byProvider[payment.provider]++;
    if (payment.status === 'completed') {
      totalAmount += payment.amount;
    }
  }

  return {
    totalPayments: paymentStore.size,
    totalAmount,
    byStatus,
    byProvider,
  };
}

/**
 * Generate payment ID
 */
function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate subscription ID
 */
function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current provider
 */
export function getPaymentProvider(): string {
  return currentProvider;
}

// Initialize on module load
initPaymentService();
