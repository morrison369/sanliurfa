/**
 * Subscription Email Integration
 * Integrates email notifications with subscription lifecycle events
 * Automatically sends emails when subscriptions are created, upgraded, downgraded, or cancelled
 */

import { queryOne } from './postgres';
import { logger } from './logging';
import {
  sendSubscriptionCreatedEmail,
  sendPlanUpgradeEmail,
  sendPlanDowngradeEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionRenewalEmail
} from './subscription-email-notifications';

/**
 * Subscription created email'i gönder
 */
export async function emailOnSubscriptionCreated(
  userId: string,
  tierId: string,
  billingCycle: string,
  price: number
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send subscription created email: user not found', { userId });
      return false;
    }

    // Get tier info
    const tier = await queryOne(
      'SELECT name, display_name FROM subscription_tiers WHERE id = $1',
      [tierId]
    );

    if (!tier) {
      logger.warn('Cannot send subscription created email: tier not found', { tierId });
      return false;
    }

    return await sendSubscriptionCreatedEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      tier.name,
      tier.display_name,
      price,
      billingCycle
    );
  } catch (error) {
    logger.error('Failed to send subscription created email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      tierId
    });
    return false;
  }
}

/**
 * Plan upgrade email'i gönder
 */
export async function emailOnPlanUpgrade(
  userId: string,
  oldTierId: string,
  newTierId: string,
  additionalCost: number
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send upgrade email: user not found', { userId });
      return false;
    }

    // Get tier info
    const oldTier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [oldTierId]
    );

    const newTier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [newTierId]
    );

    if (!oldTier || !newTier) {
      logger.warn('Cannot send upgrade email: tier not found');
      return false;
    }

    return await sendPlanUpgradeEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      oldTier.display_name,
      newTier.display_name,
      additionalCost
    );
  } catch (error) {
    logger.error('Failed to send upgrade email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      oldTierId,
      newTierId
    });
    return false;
  }
}

/**
 * Plan downgrade email'i gönder
 */
export async function emailOnPlanDowngrade(
  userId: string,
  oldTierId: string,
  newTierId: string,
  creditAmount: number
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send downgrade email: user not found', { userId });
      return false;
    }

    // Get tier info
    const oldTier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [oldTierId]
    );

    const newTier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [newTierId]
    );

    if (!oldTier || !newTier) {
      logger.warn('Cannot send downgrade email: tier not found');
      return false;
    }

    return await sendPlanDowngradeEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      oldTier.display_name,
      newTier.display_name,
      creditAmount
    );
  } catch (error) {
    logger.error('Failed to send downgrade email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      oldTierId,
      newTierId
    });
    return false;
  }
}

/**
 * Subscription cancelled email'i gönder
 */
export async function emailOnSubscriptionCancelled(
  userId: string,
  tierId: string,
  accessUntilDate: Date
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send cancellation email: user not found', { userId });
      return false;
    }

    // Get tier info
    const tier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [tierId]
    );

    if (!tier) {
      logger.warn('Cannot send cancellation email: tier not found', { tierId });
      return false;
    }

    return await sendSubscriptionCancelledEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      tier.display_name,
      new Date(),
      accessUntilDate
    );
  } catch (error) {
    logger.error('Failed to send cancellation email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      tierId
    });
    return false;
  }
}

/**
 * Payment success email'i gönder
 */
export async function emailOnPaymentSuccess(
  userId: string,
  amount: number,
  tierId: string,
  nextBillingDate: Date
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send payment success email: user not found', { userId });
      return false;
    }

    // Get tier info
    const tier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [tierId]
    );

    if (!tier) {
      logger.warn('Cannot send payment success email: tier not found', { tierId });
      return false;
    }

    return await sendPaymentSuccessEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      amount,
      tier.display_name,
      nextBillingDate
    );
  } catch (error) {
    logger.error('Failed to send payment success email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      tierId
    });
    return false;
  }
}

/**
 * Payment failed email'i gönder
 */
export async function emailOnPaymentFailed(
  userId: string,
  amount: number,
  tierId: string,
  retryDate: Date
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send payment failed email: user not found', { userId });
      return false;
    }

    // Get tier info
    const tier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [tierId]
    );

    if (!tier) {
      logger.warn('Cannot send payment failed email: tier not found', { tierId });
      return false;
    }

    return await sendPaymentFailedEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      amount,
      tier.display_name,
      retryDate
    );
  } catch (error) {
    logger.error('Failed to send payment failed email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      tierId
    });
    return false;
  }
}

/**
 * Subscription renewal email'i gönder
 */
export async function emailOnSubscriptionRenewal(
  userId: string,
  amount: number,
  tierId: string,
  renewalDate: Date
): Promise<boolean> {
  try {
    // Get user info
    const user = await queryOne(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      logger.warn('Cannot send renewal email: user not found', { userId });
      return false;
    }

    // Get tier info
    const tier = await queryOne(
      'SELECT display_name FROM subscription_tiers WHERE id = $1',
      [tierId]
    );

    if (!tier) {
      logger.warn('Cannot send renewal email: tier not found', { tierId });
      return false;
    }

    return await sendSubscriptionRenewalEmail(
      userId,
      user.email,
      user.full_name || 'Kullanıcı',
      tier.display_name,
      amount,
      renewalDate
    );
  } catch (error) {
    logger.error('Failed to send renewal email', error instanceof Error ? error : new Error(String(error)), {
      userId,
      tierId
    });
    return false;
  }
}
