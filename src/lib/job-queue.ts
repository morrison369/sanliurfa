/**
 * Phase 41: Job Queue & Background Processing
 * Priority queues, job scheduling, background workers, cron execution
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export interface Job {
  id: string;
  type: string;
  payload: any;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: number;
  createdAt: number;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

// ==================== JOB QUEUE ====================

export class JobQueue {
  private jobs = new Map<string, Job>();
  private queue: Job[] = [];
  private handlers = new Map<string, (payload: any) => Promise<any>>();
  private results = new Map<string, JobResult>();
  private jobCounter = 0;

  /**
   * Register handler for job type
   */
  registerHandler(jobType: string, handler: (payload: any) => Promise<any>): void {
    this.handlers.set(jobType, handler);
    logger.debug('Job handler registered', { jobType });
  }

  /**
   * Enqueue job
   */
  enqueue(type: string, payload: any, options?: { priority?: JobPriority; delay?: number; maxAttempts?: number }): string {
    const jobId = `job-${Date.now()}-${++this.jobCounter}`;

    const job: Job = {
      id: jobId,
      type,
      payload,
      priority: options?.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      scheduledAt: options?.delay ? Date.now() + options.delay : undefined,
      createdAt: Date.now()
    };

    this.jobs.set(jobId, job);
    this.queue.push(job);
    this.sortQueue();

    logger.debug('Job enqueued', { jobId, type, priority: job.priority });

    return jobId;
  }

  /**
   * Dequeue jobs (priority-ordered)
   */
  dequeue(count: number = 1): Job[] {
    const dequeuedJobs: Job[] = [];

    while (dequeuedJobs.length < count && this.queue.length > 0) {
      const job = this.queue.shift();
      if (job && (!job.scheduledAt || job.scheduledAt <= Date.now())) {
        job.status = 'running';
        dequeuedJobs.push(job);
      } else if (job) {
        this.queue.unshift(job); // Re-add if not yet scheduled
        break;
      }
    }

    return dequeuedJobs;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get queue stats
   */
  getStats(): { pending: number; running: number; completed: number; failed: number } {
    const stats = { pending: 0, running: 0, completed: 0, failed: 0 };

    for (const job of this.jobs.values()) {
      if (job.status === 'pending' || job.status === 'retrying') {
        stats.pending++;
      } else if (job.status === 'running') {
        stats.running++;
      } else if (job.status === 'completed') {
        stats.completed++;
      } else if (job.status === 'failed') {
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Complete job
   */
  completeJob(jobId: string, output?: any): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
    }
  }

  /**
   * Fail job
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.attempts++;

      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying';
        this.queue.push(job);
        this.sortQueue();
      } else {
        job.status = 'failed';
      }
    }
  }
}

// ==================== JOB SCHEDULER ====================

export class JobScheduler {
  private schedules = new Map<string, { cron: string; jobType: string; payload: any; lastRun?: number }>();
  private scheduleId = 0;

  /**
   * Schedule job with cron expression
   */
  schedule(cronExpression: string, jobType: string, payload: any): string {
    const id = 'schedule-' + this.scheduleId++;

    this.schedules.set(id, {
      cron: cronExpression,
      jobType,
      payload
    });

    logger.debug('Job scheduled', { id, cron: cronExpression, jobType });

    return id;
  }

  /**
   * Cancel schedule
   */
  cancel(scheduleId: string): void {
    this.schedules.delete(scheduleId);
  }

  /**
   * List schedules
   */
  listSchedules(): { id: string; cron: string; jobType: string; nextRun: number }[] {
    return Array.from(this.schedules.entries()).map(([id, schedule]) => ({
      id,
      cron: schedule.cron,
      jobType: schedule.jobType,
      nextRun: schedule.lastRun || Date.now()
    }));
  }

  /**
   * Tick (call every minute)
   */
  tick(): void {
    // Simple cron: only support basic patterns like "*/5" for every 5 minutes
    const now = new Date();
    const minutes = now.getMinutes();

    for (const [id, schedule] of this.schedules) {
      if (schedule.cron === '*/5' && minutes % 5 === 0) {
        logger.debug('Schedule triggered', { id, jobType: schedule.jobType });
        schedule.lastRun = Date.now();
      }
    }
  }
}

// ==================== JOB WORKER ====================

export class JobWorker {
  private running = false;
  private results = new Map<string, JobResult>();

  /**
   * Start worker
   */
  start(concurrency: number = 1): void {
    this.running = true;
    logger.info('Job worker started', { concurrency });
  }

  /**
   * Stop worker
   */
  stop(): void {
    this.running = false;
    logger.info('Job worker stopped');
  }

  /**
   * Process job
   */
  async processJob(job: Job, queue: JobQueue, handlers: Map<string, (payload: any) => Promise<any>>): Promise<JobResult> {
    const startTime = Date.now();
    const handler = handlers.get(job.type);

    try {
      if (!handler) {
        throw new Error(`No handler for job type: ${job.type}`);
      }

      const output = await handler(job.payload);

      const result: JobResult = {
        jobId: job.id,
        success: true,
        output,
        duration: Date.now() - startTime
      };

      this.results.set(job.id, result);
      queue.completeJob(job.id, output);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      const result: JobResult = {
        jobId: job.id,
        success: false,
        error,
        duration: Date.now() - startTime
      };

      this.results.set(job.id, result);
      queue.failJob(job.id, error);

      return result;
    }
  }

  /**
   * Get results
   */
  getResults(jobId: string): JobResult | null {
    return this.results.get(jobId) || null;
  }
}

// ==================== EXPORTS ====================

export const jobQueue = new JobQueue();
export const jobScheduler = new JobScheduler();
export const jobWorker = new JobWorker();
