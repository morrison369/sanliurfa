/**
 * Message Queue System with BullMQ
 * Phase 2.1: Async Job Processing
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection for BullMQ
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Queue definitions
export const QUEUES = {
  EMAIL: 'email-queue',
  SMS: 'sms-queue',
  NOTIFICATIONS: 'notifications-queue',
  ANALYTICS: 'analytics-queue',
  IMAGES: 'image-processing-queue',
  EXPORTS: 'data-exports-queue',
  WEBHOOKS: 'webhooks-queue',
  CLEANUP: 'cleanup-queue',
} as const;

// Queue instances cache
const queues = new Map<string, Queue>();

/**
 * Get or create queue
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: redisConnection }));
  }
  return queues.get(name)!;
}

/**
 * Job data interfaces
 */
export interface EmailJobData {
  type: 'campaign' | 'transactional' | 'welcome';
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  variables?: Record<string, any>;
}

export interface SMSJobData {
  to: string;
  message: string;
  type: 'otp' | 'notification' | 'marketing';
}

export interface ImageProcessingJobData {
  imageId: string;
  operations: Array<{
    type: 'resize' | 'compress' | 'convert' | 'watermark';
    options: any;
  }>;
}

export interface WebhookJobData {
  url: string;
  payload: any;
  headers?: Record<string, string>;
  retryCount?: number;
}

/**
 * Add job to queue with typing
 */
export async function addEmailJob(data: EmailJobData, options?: any): Promise<Job> {
  const queue = getQueue(QUEUES.EMAIL);
  return queue.add(data.type, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    ...options,
  });
}

export async function addSMSJob(data: SMSJobData, options?: any): Promise<Job> {
  const queue = getQueue(QUEUES.SMS);
  return queue.add(data.type, data, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    ...options,
  });
}

export async function addImageProcessingJob(data: ImageProcessingJobData, options?: any): Promise<Job> {
  const queue = getQueue(QUEUES.IMAGES);
  return queue.add('process', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    ...options,
  });
}

export async function addWebhookJob(data: WebhookJobData, options?: any): Promise<Job> {
  const queue = getQueue(QUEUES.WEBHOOKS);
  return queue.add('send', data, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60000 }, // 1min, 2min, 4min...
    ...options,
  });
}

/**
 * Schedule recurring jobs
 */
export async function scheduleRecurringJobs(): Promise<void> {
  const cleanupQueue = getQueue(QUEUES.CLEANUP);
  
  // Daily cleanup job
  await cleanupQueue.add('daily-cleanup', {}, {
    repeat: { cron: '0 2 * * *' }, // 2 AM daily
    jobId: 'daily-cleanup',
  });

  // Weekly analytics aggregation
  const analyticsQueue = getQueue(QUEUES.ANALYTICS);
  await analyticsQueue.add('weekly-report', {}, {
    repeat: { cron: '0 9 * * MON' }, // Monday 9 AM
    jobId: 'weekly-report',
  });
}

/**
 * Queue Worker Setup
 */
export function createWorkers(): Worker[] {
  const workers: Worker[] = [];

  // Email Worker
  workers.push(new Worker(QUEUES.EMAIL, async (job) => {
    console.log(`[Worker] Processing email job ${job.id}`);
    // Process email...
    await processEmail(job.data as EmailJobData);
  }, { connection: redisConnection, concurrency: 5 }));

  // SMS Worker
  workers.push(new Worker(QUEUES.SMS, async (job) => {
    console.log(`[Worker] Processing SMS job ${job.id}`);
    await processSMS(job.data as SMSJobData);
  }, { connection: redisConnection, concurrency: 3 }));

  // Image Processing Worker
  workers.push(new Worker(QUEUES.IMAGES, async (job) => {
    console.log(`[Worker] Processing image job ${job.id}`);
    await processImage(job.data as ImageProcessingJobData);
  }, { connection: redisConnection, concurrency: 2 }));

  // Webhook Worker
  workers.push(new Worker(QUEUES.WEBHOOKS, async (job) => {
    console.log(`[Worker] Processing webhook job ${job.id}`);
    await processWebhook(job.data as WebhookJobData);
  }, { connection: redisConnection, concurrency: 10 }));

  return workers;
}

// Job processors
async function processEmail(data: EmailJobData): Promise<void> {
  // Implementation
  console.log(`Sending email to ${data.to}`);
}

async function processSMS(data: SMSJobData): Promise<void> {
  // Implementation
  console.log(`Sending SMS to ${data.to}`);
}

async function processImage(data: ImageProcessingJobData): Promise<void> {
  // Implementation
  console.log(`Processing image ${data.imageId}`);
}

async function processWebhook(data: WebhookJobData): Promise<void> {
  const response = await fetch(data.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...data.headers },
    body: JSON.stringify(data.payload),
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {};
  
  for (const [key, name] of Object.entries(QUEUES)) {
    const queue = getQueue(name);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    stats[name] = { waiting, active, completed, failed, delayed };
  }
  
  return stats;
}

/**
 * Graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  await redisConnection.quit();
}
