/**
 * Email Service
 * Core email sending, queue management, and template rendering
 */

import { query, queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';

export interface EmailMessage {
  id?: string;
  recipientEmail: string;
  recipientId?: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  templateId?: string;
  campaignId?: string;
  messageType: string;
  priority?: number;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface QueuedEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  deliveryAttempts: number;
  sentAt?: Date;
  lastError?: string;
  createdAt: Date;
}

/**
 * Enqueue email for sending
 */
export async function enqueueEmail(email: EmailMessage): Promise<string> {
  const id = crypto.randomUUID();

  try {
    await insert('email_queue', {
      id,
      recipient_email: email.recipientEmail,
      recipient_id: email.recipientId || null,
      subject: email.subject,
      html_content: email.htmlContent,
      plain_text_content: email.plainTextContent || null,
      template_id: email.templateId || null,
      campaign_id: email.campaignId || null,
      message_type: email.messageType,
      priority: email.priority || 5,
      status: 'pending',
      scheduled_for: email.scheduledFor || null,
      metadata: email.metadata ? JSON.stringify(email.metadata) : null,
    });

    logger.info('Email enqueued', { id, recipientEmail: email.recipientEmail });
    return id;
  } catch (error) {
    logger.error('Failed to enqueue email', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get pending emails from queue (for sending)
 */
export async function getPendingEmails(limit: number = 100): Promise<QueuedEmail[]> {
  try {
    const emails = await queryMany(`
      SELECT id, recipient_email, subject, status, delivery_attempts, sent_at, last_error, created_at
      FROM email_queue
      WHERE status = 'pending' AND delivery_attempts < max_attempts
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      ORDER BY priority DESC, created_at ASC
      LIMIT $1
    `, [limit]);

    return emails.map((email: any) => ({
      id: email.id,
      recipientEmail: email.recipient_email,
      subject: email.subject,
      status: email.status,
      deliveryAttempts: email.delivery_attempts,
      sentAt: email.sent_at,
      lastError: email.last_error,
      createdAt: email.created_at,
    }));
  } catch (error) {
    logger.error('Failed to get pending emails', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Mark email as sent
 */
export async function markEmailSent(queueId: string, providerMessageId?: string): Promise<void> {
  try {
    await update('email_queue', { id: queueId }, {
      status: 'sent',
      sent_at: new Date(),
      updated_at: new Date(),
    });

    if (providerMessageId) {
      await insert('email_delivery_logs', {
        queue_id: queueId,
        recipient_email: '',
        status: 'sent',
        provider_message_id: providerMessageId,
        attempt_number: 1,
      });
    }

    logger.info('Email marked as sent', { queueId, providerMessageId });
  } catch (error) {
    logger.error('Failed to mark email as sent', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Record failed delivery attempt
 */
export async function recordDeliveryFailure(
  queueId: string,
  recipientEmail: string,
  errorType: string,
  errorMessage: string,
): Promise<void> {
  try {
    const email = await queryOne('SELECT delivery_attempts FROM email_queue WHERE id = $1', [queueId]);

    if (!email) return;

    const nextAttempt = (email.delivery_attempts || 0) + 1;

    // Calculate next retry time (exponential backoff)
    const backoffMinutes = Math.min(Math.pow(2, nextAttempt), 240);
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    await update('email_queue', { id: queueId }, {
      delivery_attempts: nextAttempt,
      last_attempt_at: new Date(),
      last_error: errorMessage,
      status: nextAttempt >= 5 ? 'failed' : 'pending',
      scheduled_for: nextAttempt < 5 ? nextRetryAt : null,
      updated_at: new Date(),
    });

    // Log the failure
    await insert('email_delivery_logs', {
      queue_id: queueId,
      recipient_email: recipientEmail,
      status: 'failed',
      error_type: errorType,
      error_message: errorMessage,
      attempt_number: nextAttempt,
    });

    logger.info('Delivery failure recorded', {
      queueId,
      recipientEmail,
      attempt: nextAttempt,
      nextRetry: nextAttempt < 5 ? nextRetryAt : 'none',
    });
  } catch (error) {
    logger.error('Failed to record delivery failure', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Check if email is suppressed
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const suppressed = await queryOne(`
      SELECT id FROM email_suppression_list
      WHERE email_address = $1 AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    `, [email.toLowerCase()]);

    return !!suppressed;
  } catch (error) {
    logger.error('Failed to check email suppression', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Add email to suppression list
 */
export async function suppressEmail(email: string, reason: string, expiresAt?: Date): Promise<void> {
  try {
    await insert('email_suppression_list', {
      email_address: email.toLowerCase(),
      suppression_reason: reason,
      is_active: true,
      expires_at: expiresAt || null,
    });

    logger.info('Email suppressed', { email, reason });
  } catch (error) {
    logger.error('Failed to suppress email', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Record bounce event
 */
export async function recordBounce(
  email: string,
  bounceType: string,
  bounceSubtype?: string,
  campaignId?: string,
  permanent: boolean = true,
): Promise<void> {
  try {
    await insert('email_bounces', {
      email_address: email.toLowerCase(),
      bounce_type: bounceType,
      bounce_subtype: bounceSubtype || null,
      campaign_id: campaignId || null,
      bounced_at: new Date(),
      is_permanent: permanent,
    });

    // Add to suppression list if permanent bounce
    if (permanent) {
      await suppressEmail(email, `${bounceType} bounce`);
    }

    logger.info('Bounce recorded', { email, bounceType });
  } catch (error) {
    logger.error('Failed to record bounce', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Record complaint (spam report)
 */
export async function recordComplaint(
  email: string,
  campaignId?: string,
  feedbackType?: string,
): Promise<void> {
  try {
    await insert('email_complaints', {
      email_address: email.toLowerCase(),
      campaign_id: campaignId || null,
      complaint_feedback_type: feedbackType || 'spam',
      complained_at: new Date(),
    });

    // Add to suppression list
    await suppressEmail(email, 'User complaint');

    logger.info('Complaint recorded', { email, campaignId });
  } catch (error) {
    logger.error('Failed to record complaint', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Record engagement event (open, click, conversion)
 */
export async function recordEngagement(
  queueId: string,
  campaignId: string,
  recipientId: string | undefined,
  recipientEmail: string,
  engagementType: 'open' | 'click' | 'conversion',
  metadata?: any,
): Promise<void> {
  try {
    await insert('email_engagement', {
      queue_id: queueId,
      campaign_id: campaignId,
      recipient_id: recipientId || null,
      recipient_email: recipientEmail,
      engagement_type: engagementType,
      link_url: metadata?.linkUrl || null,
      link_id: metadata?.linkId || null,
      ip_address: metadata?.ipAddress || null,
      user_agent: metadata?.userAgent || null,
      device_type: metadata?.deviceType || null,
      country: metadata?.country || null,
      city: metadata?.city || null,
    });

    // Update campaign counters
    if (engagementType === 'open') {
      await query(`
        UPDATE email_campaigns SET open_count = open_count + 1
        WHERE id = $1
      `, [campaignId]);
    } else if (engagementType === 'click') {
      await query(`
        UPDATE email_campaigns SET click_count = click_count + 1
        WHERE id = $1
      `, [campaignId]);
    } else if (engagementType === 'conversion') {
      await query(`
        UPDATE email_campaigns SET conversion_count = conversion_count + 1
        WHERE id = $1
      `, [campaignId]);
    }

    logger.info('Engagement recorded', {
      queueId,
      campaignId,
      engagementType,
    });
  } catch (error) {
    logger.error('Failed to record engagement', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get email queue stats
 */
export async function getQueueStats(): Promise<{
  pending: number;
  sent: number;
  failed: number;
  avgDeliveryTime: number;
}> {
  try {
    const stats = await queryOne(`
      SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        EXTRACT(EPOCH FROM AVG(CASE WHEN sent_at IS NOT NULL
          THEN sent_at - created_at ELSE NULL END)) as avg_delivery_time
      FROM email_queue
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `, []);

    return {
      pending: stats?.pending || 0,
      sent: stats?.sent || 0,
      failed: stats?.failed || 0,
      avgDeliveryTime: stats?.avg_delivery_time || 0,
    };
  } catch (error) {
    logger.error('Failed to get queue stats', error instanceof Error ? error : new Error(String(error)));
    return {
      pending: 0,
      sent: 0,
      failed: 0,
      avgDeliveryTime: 0,
    };
  }
}
