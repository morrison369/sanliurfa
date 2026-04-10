/**
 * Webhook delivery queue with retry logic and Dead Letter Queue (DLQ)
 * Ensures reliable webhook delivery with exponential backoff
 */

import { randomUUID } from 'crypto';
import { pool } from './postgres';
import { logger } from './logging';
import { fetchWithTimeout } from './http';
import { getCache, setCache } from './cache';

export interface WebhookDeliveryJob {
  id: string;
  webhookId: string;
  payload: Record<string, any>;
  url: string;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  lastError?: string;
  lastErrorAt?: Date;
  deliveredAt?: Date;
  dlqAt?: Date;
  createdAt: Date;
}

/**
 * Webhook queue manager with retry and DLQ support
 */
export class WebhookQueue {
  private readonly maxRetries = 5;
  private readonly initialBackoff = 60; // seconds
  private readonly maxBackoff = 3600; // 1 hour
  private readonly timeout = 30000; // 30 seconds

  /**
   * Enqueue webhook delivery
   */
  async enqueue(
    webhookId: string,
    payload: Record<string, any>,
    url: string,
    headers?: Record<string, string>
  ): Promise<string> {
    const jobId = this.generateId();

    try {
      await pool.query(
        `INSERT INTO webhook_delivery_queue
         (id, webhook_id, payload, url, headers, retry_count, max_retries, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          jobId,
          webhookId,
          JSON.stringify(payload),
          url,
          JSON.stringify(headers || {}),
          0,
          this.maxRetries
        ]
      );

      logger.info('Webhook delivery enqueued', { jobId, webhookId, url });
      return jobId;
    } catch (error) {
      logger.error('Failed to enqueue webhook', error instanceof Error ? error : new Error(String(error)), {
        webhookId,
        url
      });
      throw error;
    }
  }

  /**
   * Process pending deliveries
   */
  async processPending(): Promise<void> {
    try {
      // Get pending jobs that are ready to retry
      const result = await pool.query(
        `SELECT * FROM webhook_delivery_queue
         WHERE delivered_at IS NULL
         AND dlq_at IS NULL
         AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY created_at ASC
         LIMIT 50`
      );

      for (const job of result.rows) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error('Error processing webhook queue', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Process single webhook delivery job
   */
  async processJob(job: any): Promise<void> {
    try {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      const headers = typeof job.headers === 'string' ? JSON.parse(job.headers) : (job.headers || {});

      try {
        const response = await fetchWithTimeout(job.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(payload)
        }, this.timeout);

        if (response.ok) {
          // Success
          await pool.query(
            `UPDATE webhook_delivery_queue
             SET delivered_at = NOW()
             WHERE id = $1`,
            [job.id]
          );

          logger.info('Webhook delivered successfully', {
            jobId: job.id,
            url: job.url,
            status: response.status
          });
        } else {
          // Retry on server errors
          if (response.status >= 500) {
            await this.scheduleRetry(job);
          } else {
            // Move to DLQ on client errors
            await this.moveToDLQ(job, `HTTP ${response.status}: ${response.statusText}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (job.retry_count < this.maxRetries) {
          await this.scheduleRetry(job, errorMsg);
        } else {
          await this.moveToDLQ(job, errorMsg);
        }
      }
    } catch (error) {
      logger.error('Error processing webhook job', error instanceof Error ? error : new Error(String(error)), {
        jobId: job.id
      });

      // Move to DLQ if processing fails
      await this.moveToDLQ(job, 'Processing error');
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  async scheduleRetry(job: any, error?: string): Promise<void> {
    const nextRetryCount = job.retry_count + 1;
    const backoffSeconds = Math.min(
      this.initialBackoff * Math.pow(2, job.retry_count),
      this.maxBackoff
    );
    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

    try {
      await pool.query(
        `UPDATE webhook_delivery_queue
         SET retry_count = $1,
             next_retry_at = $2,
             last_error = $3,
             last_error_at = NOW()
         WHERE id = $4`,
        [nextRetryCount, nextRetryAt, error || null, job.id]
      );

      logger.info('Webhook retry scheduled', {
        jobId: job.id,
        retryCount: nextRetryCount,
        nextRetryAt: nextRetryAt.toISOString(),
        backoffSeconds
      });
    } catch (err) {
      logger.error('Failed to schedule retry', err instanceof Error ? err : new Error(String(err)), {
        jobId: job.id
      });
    }
  }

  /**
   * Move job to Dead Letter Queue
   */
  async moveToDLQ(job: any, reason: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE webhook_delivery_queue
         SET dlq_at = NOW(),
             last_error = $1,
             last_error_at = NOW()
         WHERE id = $2`,
        [reason, job.id]
      );

      logger.warn('Webhook moved to DLQ', {
        jobId: job.id,
        url: job.url,
        reason,
        retries: job.retry_count
      });

      // Send alert if configured
      await this.sendDLQAlert(job, reason);
    } catch (error) {
      logger.error('Failed to move to DLQ', error instanceof Error ? error : new Error(String(error)), {
        jobId: job.id
      });
    }
  }

  /**
   * Send DLQ alert (email/notification)
   */
  async sendDLQAlert(job: any, reason: string): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO webhook_dlq_alerts (webhook_id, job_id, reason, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [job.webhook_id, job.id, reason]
      );
    } catch (error) {
      logger.error('Failed to create DLQ alert', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Retry job from DLQ
   */
  async retryFromDLQ(jobId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE webhook_delivery_queue
         SET dlq_at = NULL,
             retry_count = 0,
             next_retry_at = NOW(),
             last_error = NULL
         WHERE id = $1 AND dlq_at IS NOT NULL
         RETURNING *`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      logger.info('Job retried from DLQ', { jobId });
      return true;
    } catch (error) {
      logger.error('Failed to retry from DLQ', error instanceof Error ? error : new Error(String(error)), {
        jobId
      });
      return false;
    }
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    pending: number;
    dlq: number;
    delivered: number;
    avgRetries: number;
  }> {
    try {
      const cacheKey = 'sanliurfa:webhook:queue:stats';
      const cached = await getCache(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const result = await pool.query(
        `SELECT
           COUNT(CASE WHEN delivered_at IS NULL AND dlq_at IS NULL THEN 1 END) as pending,
           COUNT(CASE WHEN dlq_at IS NOT NULL THEN 1 END) as dlq,
           COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) as delivered,
           ROUND(AVG(retry_count))::INT as avg_retries
         FROM webhook_delivery_queue`
      );

      const stats = {
        pending: parseInt(result.rows[0].pending || '0'),
        dlq: parseInt(result.rows[0].dlq || '0'),
        delivered: parseInt(result.rows[0].delivered || '0'),
        avgRetries: parseInt(result.rows[0].avg_retries || '0')
      };

      await setCache(cacheKey, JSON.stringify(stats), 300); // Cache for 5 min

      return stats;
    } catch (error) {
      logger.error('Failed to get queue stats', error instanceof Error ? error : new Error(String(error)));
      return { pending: 0, dlq: 0, delivered: 0, avgRetries: 0 };
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `wh_${randomUUID()}`;
  }
}

/**
 * Global webhook queue instance
 */
let webhookQueue: WebhookQueue | null = null;

export function getWebhookQueue(): WebhookQueue {
  if (!webhookQueue) {
    webhookQueue = new WebhookQueue();
  }
  return webhookQueue;
}

/**
 * Start webhook processor (run periodically, e.g., every 30 seconds)
 */
export function startWebhookProcessor(intervalMs: number = 30000): NodeJS.Timer {
  const processQueue = async () => {
    const queue = getWebhookQueue();
    await queue.processPending();
  };

  // Process immediately
  processQueue().catch(err => logger.error('Webhook processor error', err instanceof Error ? err : new Error(String(err))));

  // Then process on interval
  return setInterval(() => {
    processQueue().catch(err => logger.error('Webhook processor error', err instanceof Error ? err : new Error(String(err))));
  }, intervalMs);
}
