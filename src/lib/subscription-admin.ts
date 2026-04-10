/**
 * Subscription Admin Management Library
 * Admin functions for subscription management and analytics
 */

import { query, queryOne, queryRows, insert, update as updateDb } from './postgres';
import { logger } from './logging';
import { createRefundForInvoice } from './stripe-client';

/**
 * Get subscription analytics
 */
export async function getSubscriptionAnalytics(): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  byTier: Record<string, number>;
  mrr: number;
  arr: number;
  averageLifetimeValue: number;
  churnRate: number;
}> {
  try {
    // Total subscriptions
    const totalResult = await queryOne(
      'SELECT COUNT(*) as count FROM subscriptions'
    );

    const activeResult = await queryOne(
      `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`
    );

    const cancelledResult = await queryOne(
      `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'cancelled'`
    );

    // By tier
    const byTierResults = await queryRows(
      `SELECT st.display_name, COUNT(*) as count
       FROM subscriptions s
       JOIN subscription_tiers st ON s.tier_id = st.id
       WHERE s.status = 'active'
       GROUP BY st.display_name`
    );

    const byTier: Record<string, number> = {};
    byTierResults.forEach((r: any) => {
      byTier[r.display_name] = r.count;
    });

    // MRR (Monthly Recurring Revenue)
    const mrrResult = await queryOne(
      `SELECT COALESCE(SUM(st.monthly_price), 0) as mrr
       FROM subscriptions s
       JOIN subscription_tiers st ON s.tier_id = st.id
       WHERE s.status = 'active' AND s.billing_cycle = 'monthly'`
    );

    const arrResult = await queryOne(
      `SELECT COALESCE(SUM(st.annual_price), 0) as arr
       FROM subscriptions s
       JOIN subscription_tiers st ON s.tier_id = st.id
       WHERE s.status = 'active' AND s.billing_cycle = 'annual'`
    );

    // Churn rate (last 30 days)
    const churnResult = await queryOne(
      `SELECT
        COUNT(CASE WHEN status = 'cancelled' AND end_date > NOW() - INTERVAL '30 days' THEN 1 END)::float /
        NULLIF(COUNT(CASE WHEN status = 'active' THEN 1 END), 0) * 100 as churn_rate
       FROM subscriptions`
    );

    const lifetimeValueResult = await queryOne(
      `SELECT COALESCE(AVG(customer_total), 0) as average_lifetime_value
       FROM (
         SELECT user_id, SUM(amount) as customer_total
         FROM billing_history
         WHERE payment_status = 'paid'
         GROUP BY user_id
       ) customer_revenue`
    );

    return {
      totalSubscriptions: totalResult?.count || 0,
      activeSubscriptions: activeResult?.count || 0,
      cancelledSubscriptions: cancelledResult?.count || 0,
      byTier,
      mrr: parseFloat(mrrResult?.mrr || 0),
      arr: parseFloat(arrResult?.arr || 0),
      averageLifetimeValue: parseFloat(lifetimeValueResult?.average_lifetime_value || 0),
      churnRate: parseFloat(churnResult?.churn_rate || 0),
    };
  } catch (error) {
    logger.error('Failed to get subscription analytics', error instanceof Error ? error : new Error(String(error)));
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      byTier: {},
      mrr: 0,
      arr: 0,
      averageLifetimeValue: 0,
      churnRate: 0,
    };
  }
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string,
  targetSubscriptionId?: string,
  details?: any,
  notes?: string
): Promise<void> {
  try {
    await insert('admin_subscription_logs', {
      admin_id: adminId,
      action,
      target_user_id: targetUserId || null,
      target_subscription_id: targetSubscriptionId || null,
      details: details ? JSON.stringify(details) : null,
      notes,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to log admin action', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Manually change user subscription tier
 */
export async function changeUserTier(
  adminId: string,
  userId: string,
  newTierId: string,
  reason?: string
): Promise<boolean> {
  try {
    // Get current subscription
    const currentSub = await queryOne(
      'SELECT id, tier_id FROM subscriptions WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (!currentSub) {
      return false;
    }

    const oldTierId = currentSub.tier_id;

    // Update subscription
    await updateDb('subscriptions', currentSub.id, {
      tier_id: newTierId,
      updated_at: new Date().toISOString(),
    });

    // Log event
    await insert('subscription_events', {
      subscription_id: currentSub.id,
      user_id: userId,
      event_type: 'tier_changed',
      old_tier_id: oldTierId,
      new_tier_id: newTierId,
      reason: reason || 'Admin override',
      created_at: new Date().toISOString(),
    });

    // Log admin action
    await logAdminAction(
      adminId,
      'change_tier',
      userId,
      currentSub.id,
      { oldTierId, newTierId },
      reason
    );

    logger.info('User tier changed', {
      userId,
      oldTierId,
      newTierId,
      admin: adminId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to change user tier', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Process refund request
 */
export async function processRefund(
  adminId: string,
  refundRequestId: string,
  approve: boolean,
  notes?: string
): Promise<boolean> {
  try {
    const refundRequest = await queryOne(
      `SELECT r.id, r.user_id, r.amount, r.billing_id, b.subscription_id, b.currency, b.stripe_invoice_id
       FROM refund_requests r
       JOIN billing_history b ON r.billing_id = b.id
       WHERE r.id = $1`,
      [refundRequestId]
    );

    if (!refundRequest) {
      return false;
    }

    const status = approve ? 'approved' : 'rejected';

    await updateDb('refund_requests', refundRequestId, {
      status,
      processed_by: adminId,
      admin_notes: notes,
      processed_at: new Date().toISOString(),
    });

    if (approve) {
      if (refundRequest.stripe_invoice_id) {
        const stripeRefund = await createRefundForInvoice(refundRequest.stripe_invoice_id, Number(refundRequest.amount));

        await updateDb('billing_history', refundRequest.billing_id, {
          payment_status: 'refunded'
        });

        await insert('subscription_events', {
          subscription_id: refundRequest.subscription_id,
          user_id: refundRequest.user_id,
          event_type: 'refund_processed',
          amount: refundRequest.amount,
          currency: refundRequest.currency || 'TRY',
          reason: notes || 'Admin refund',
          metadata: JSON.stringify({
            refundRequestId,
            stripeRefundId: stripeRefund.id,
            stripeInvoiceId: refundRequest.stripe_invoice_id
          }),
          created_at: new Date().toISOString(),
        });
      }

      logger.info('Refund approved', {
        refundId: refundRequestId,
        userId: refundRequest.user_id,
        amount: refundRequest.amount,
        admin: adminId,
      });
    }

    return true;
  } catch (error) {
    logger.error('Failed to process refund', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get refund requests
 */
export async function getRefundRequests(status?: string): Promise<any[]> {
  try {
    let sql = `SELECT r.*, b.amount as billing_amount, u.email
               FROM refund_requests r
               JOIN billing_history b ON r.billing_id = b.id
               JOIN users u ON r.user_id = u.id
               WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      sql += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT 100`;

    return await queryRows(sql, params);
  } catch (error) {
    logger.error('Failed to get refund requests', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get subscription events
 */
export async function getSubscriptionEvents(userId?: string, limit: number = 100): Promise<any[]> {
  try {
    let sql = `SELECT se.*, st1.display_name as old_tier, st2.display_name as new_tier
               FROM subscription_events se
               LEFT JOIN subscription_tiers st1 ON se.old_tier_id = st1.id
               LEFT JOIN subscription_tiers st2 ON se.new_tier_id = st2.id
               WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (userId) {
      sql += ` AND se.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    sql += ` ORDER BY se.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    return await queryRows(sql, params);
  } catch (error) {
    logger.error('Failed to get subscription events', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get admin activity logs
 */
export async function getAdminLogs(adminId?: string, limit: number = 100): Promise<any[]> {
  try {
    let sql = `SELECT asl.*, u.email as target_email
               FROM admin_subscription_logs asl
               LEFT JOIN users u ON asl.target_user_id = u.id
               WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (adminId) {
      sql += ` AND asl.admin_id = $${paramCount}`;
      params.push(adminId);
      paramCount++;
    }

    sql += ` ORDER BY asl.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    return await queryRows(sql, params);
  } catch (error) {
    logger.error('Failed to get admin logs', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get webhook delivery status
 */
export async function getWebhookStatus(): Promise<{
  pending: number;
  failed: number;
  successful: number;
  retrying: number;
  lastDelivery: string | null;
}> {
  try {
    const pendingResult = await queryOne(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = 'pending'"
    );

    const failedResult = await queryOne(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = 'failed'"
    );

    const successfulResult = await queryOne(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = 'completed'"
    );

    const retryingResult = await queryOne(
      "SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = 'retrying'"
    );

    const lastResult = await queryOne(
      "SELECT completed_at FROM webhook_deliveries WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1"
    );

    return {
      pending: pendingResult?.count || 0,
      failed: failedResult?.count || 0,
      successful: successfulResult?.count || 0,
      retrying: retryingResult?.count || 0,
      lastDelivery: lastResult?.completed_at || null,
    };
  } catch (error) {
    logger.error('Failed to get webhook status', error instanceof Error ? error : new Error(String(error)));
    return {
      pending: 0,
      failed: 0,
      successful: 0,
      retrying: 0,
      lastDelivery: null,
    };
  }
}

/**
 * Get user subscription with details
 */
export async function getUserSubscriptionDetails(userId: string): Promise<any> {
  try {
    const subscription = await queryOne(
      `SELECT s.*, st.display_name, st.monthly_price, st.annual_price
       FROM subscriptions s
       LEFT JOIN subscription_tiers st ON s.tier_id = st.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [userId]
    );

    if (!subscription) {
      return null;
    }

    const billingHistory = await queryRows(
      `SELECT * FROM billing_history WHERE subscription_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [subscription.id]
    );

    const events = await getSubscriptionEvents(userId, 20);

    return {
      subscription,
      billingHistory,
      events,
    };
  } catch (error) {
    logger.error('Failed to get user subscription details', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
