/**
 * Background job queue system for async tasks
 * Supports email sending, notifications, reports, etc.
 */

import { randomUUID } from 'crypto';
import { getCache, setCache } from './cache';
import { logger } from './logging';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'delayed';

export interface BackgroundJob {
  id: string;
  type: string;
  payload: Record<string, any>;
  status: JobStatus;
  priority: number; // 0-10, higher = more important
  retries: number;
  maxRetries: number;
  error?: string;
  result?: Record<string, any>;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface JobHandler {
  (payload: Record<string, any>): Promise<any>;
}

/**
 * Background job queue processor
 */
export class BackgroundJobQueue {
  private handlers: Map<string, JobHandler> = new Map();
  private processingJobs: Set<string> = new Set();
  private maxConcurrent: number = 5;

  /**
   * Register job handler
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
    logger.info('Job handler registered', { jobType });
  }

  /**
   * Enqueue job
   */
  async enqueue(
    type: string,
    payload: Record<string, any>,
    options: {
      priority?: number;
      maxRetries?: number;
      delayMs?: number;
    } = {}
  ): Promise<string> {
    const jobId = this.generateId();
    const { priority = 5, maxRetries = 3, delayMs = 0 } = options;

    const job: BackgroundJob = {
      id: jobId,
      type,
      payload,
      status: delayMs > 0 ? 'delayed' : 'pending',
      priority,
      retries: 0,
      maxRetries,
      createdAt: new Date()
    };

    if (delayMs > 0) {
      job.scheduledFor = new Date(Date.now() + delayMs);
    }

    try {
      const key = `sanliurfa:job:${jobId}`;
      await setCache(key, JSON.stringify(job), 86400 * 7); // 7 days

      logger.info('Job enqueued', {
        jobId,
        type,
        priority,
        delayed: delayMs > 0
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to enqueue job', error instanceof Error ? error : new Error(String(error)), {
        type
      });
      throw error;
    }
  }

  /**
   * Process pending jobs
   */
  async processPending(): Promise<void> {
    // Skip if at max concurrent
    if (this.processingJobs.size >= this.maxConcurrent) {
      return;
    }

    // Get pending jobs sorted by priority and creation time
    const jobIds = await this.getPendingJobIds();

    for (const jobId of jobIds) {
      if (this.processingJobs.size >= this.maxConcurrent) {
        break;
      }

      await this.processJob(jobId);
    }
  }

  /**
   * Process single job
   */
  async processJob(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      return;
    }

    this.processingJobs.add(jobId);

    try {
      const job = await this.getJob(jobId);

      if (!job) {
        this.processingJobs.delete(jobId);
        return;
      }

      // Check if delayed
      if (job.status === 'delayed' && job.scheduledFor && job.scheduledFor > new Date()) {
        this.processingJobs.delete(jobId);
        return;
      }

      // Get handler
      const handler = this.handlers.get(job.type);
      if (!handler) {
        await this.failJob(jobId, `No handler registered for job type: ${job.type}`);
        this.processingJobs.delete(jobId);
        return;
      }

      // Update status to processing
      job.status = 'processing';
      job.startedAt = new Date();
      await this.updateJob(jobId, job);

      // Execute job
      const result = await handler(job.payload);

      // Mark as completed
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      await this.updateJob(jobId, job);

      logger.info('Job completed', {
        jobId,
        type: job.type,
        duration: job.completedAt.getTime() - job.createdAt.getTime()
      });
    } catch (error) {
      const job = await this.getJob(jobId);
      if (!job) {
        this.processingJobs.delete(jobId);
        return;
      }

      job.retries += 1;

      if (job.retries < job.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.retries) * 1000;
        job.status = 'delayed';
        job.scheduledFor = new Date(Date.now() + delay);
        job.error = error instanceof Error ? error.message : String(error);

        await this.updateJob(jobId, job);

        logger.warn('Job retry scheduled', {
          jobId,
          type: job.type,
          retries: job.retries,
          delayMs: delay,
          error: job.error
        });
      } else {
        // Final failure
        await this.failJob(jobId, error instanceof Error ? error.message : String(error));

        logger.error('Job failed permanently', {
          jobId,
          type: job.type,
          retries: job.retries,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<BackgroundJob | null> {
    try {
      const key = `sanliurfa:job:${jobId}`;
      const cached = await getCache(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as BackgroundJob;
    } catch (error) {
      logger.error('Failed to get job', error instanceof Error ? error : new Error(String(error)), { jobId });
      return null;
    }
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, job: BackgroundJob): Promise<void> {
    try {
      const key = `sanliurfa:job:${jobId}`;
      await setCache(key, JSON.stringify(job), 86400 * 7);
    } catch (error) {
      logger.error('Failed to update job', error instanceof Error ? error : new Error(String(error)), { jobId });
    }
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date();

    await this.updateJob(jobId, job);
  }

  /**
   * Get pending job IDs (for processing)
   */
  private async getPendingJobIds(): Promise<string[]> {
    // In production, this would query a database or Redis set
    // For now, returning empty (jobs would be tracked separately)
    return [];
  }

  /**
   * Generate job ID
   */
  private generateId(): string {
    return `job_${randomUUID()}`;
  }
}

/**
 * Built-in job types
 */
export const JobTypes = {
  SEND_EMAIL: 'send_email',
  SEND_NOTIFICATION: 'send_notification',
  GENERATE_REPORT: 'generate_report',
  SYNC_DATA: 'sync_data',
  CLEANUP: 'cleanup',
  INDEX_SEARCH: 'index_search',
  PROCESS_EMAIL_SEQUENCES: 'process_email_sequences',
  SEND_SCHEDULED_CAMPAIGNS: 'send_scheduled_campaigns'
} as const;

/**
 * Global job queue instance
 */
let jobQueue: BackgroundJobQueue | null = null;

export function getJobQueue(): BackgroundJobQueue {
  if (!jobQueue) {
    jobQueue = new BackgroundJobQueue();
    setupDefaultHandlers(jobQueue);
  }
  return jobQueue;
}

/**
 * Setup default job handlers
 */
function setupDefaultHandlers(queue: BackgroundJobQueue): void {
  // Email sending
  queue.registerHandler(JobTypes.SEND_EMAIL, async (payload) => {
    const { to, subject, html } = payload;
    logger.info('Sending email', { to, subject });
    // Actual email sending implementation would go here
    return { sent: true, to };
  });

  // Notifications
  queue.registerHandler(JobTypes.SEND_NOTIFICATION, async (payload) => {
    const { userId, title, message } = payload;
    logger.info('Sending notification', { userId, title });
    // Actual notification sending would go here
    return { sent: true, userId };
  });

  // Cleanup old data
  queue.registerHandler(JobTypes.CLEANUP, async (payload) => {
    logger.info('Running cleanup task');
    // Cleanup logic would go here
    return { cleaned: true };
  });

  // Process email sequences
  queue.registerHandler(JobTypes.PROCESS_EMAIL_SEQUENCES, async (payload) => {
    try {
      const { processSequenceQueue } = await import('./email-automation');
      const result = await processSequenceQueue();
      logger.info('Email sequences processed', { processed: result.processed, failed: result.failed });
      return result;
    } catch (error) {
      logger.error('Failed to process email sequences', error instanceof Error ? error : new Error(String(error)));
      return { processed: 0, failed: 0 };
    }
  });

  // Send scheduled campaigns
  queue.registerHandler(JobTypes.SEND_SCHEDULED_CAMPAIGNS, async (payload) => {
    try {
      const { queryRows, update } = await import('./postgres');

      // Get campaigns scheduled for now
      const scheduledCampaigns = await queryRows(
        'SELECT id FROM email_campaigns WHERE status = $1 AND scheduled_at <= NOW()',
        ['scheduled']
      );

      let sent = 0;
      for (const campaign of scheduledCampaigns) {
        try {
          const { sendCampaign } = await import('./email-campaigns');
          const result = await sendCampaign(campaign.id);
          if (result) {
            sent++;
          }
        } catch (error) {
          logger.warn('Failed to send scheduled campaign', { campaignId: campaign.id });
        }
      }

      logger.info('Scheduled campaigns sent', { count: sent });
      return { sent };
    } catch (error) {
      logger.error('Failed to send scheduled campaigns', error instanceof Error ? error : new Error(String(error)));
      return { sent: 0 };
    }
  });
}

/**
 * Start background job processor
 */
export function startJobProcessor(intervalMs: number = 5000, maxConcurrent: number = 5): NodeJS.Timer {
  const queue = getJobQueue();
  queue['maxConcurrent'] = maxConcurrent;

  const process = async () => {
    await queue.processPending();
  };

  // Process immediately
  process().catch(err => logger.error('Job processor error', err instanceof Error ? err : new Error(String(err))));

  // Then process on interval
  return setInterval(() => {
    process().catch(err => logger.error('Job processor error', err instanceof Error ? err : new Error(String(err))));
  }, intervalMs);
}

/**
 * Start background automation jobs (sequences, scheduled campaigns, etc)
 */
export function startAutomationJobs(): {
  sequenceProcessor: NodeJS.Timer;
  campaignScheduler: NodeJS.Timer;
} {
  const queue = getJobQueue();

  // Process email sequences every 10 minutes
  const sequenceProcessor = setInterval(async () => {
    try {
      await queue.enqueue(JobTypes.PROCESS_EMAIL_SEQUENCES, {}, { priority: 7 });
    } catch (error) {
      logger.warn('Failed to enqueue sequence processing job', error instanceof Error ? error : new Error(String(error)));
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Send scheduled campaigns every 5 minutes
  const campaignScheduler = setInterval(async () => {
    try {
      await queue.enqueue(JobTypes.SEND_SCHEDULED_CAMPAIGNS, {}, { priority: 8 });
    } catch (error) {
      logger.warn('Failed to enqueue scheduled campaign job', error instanceof Error ? error : new Error(String(error)));
    }
  }, 5 * 60 * 1000); // 5 minutes

  logger.info('Automation jobs started', {
    sequenceInterval: '10 minutes',
    campaignInterval: '5 minutes'
  });

  return { sequenceProcessor, campaignScheduler };
}
