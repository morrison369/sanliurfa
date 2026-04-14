/**
 * Scheduler Module
 * Cron-like job scheduling for data exports, reports, and maintenance
 */

import { query } from '../postgres';

export interface ScheduledJob {
  id: string;
  name: string;
  type: 'export' | 'report' | 'cleanup' | 'notification' | 'maintenance' | 'custom';
  schedule: string; // cron expression
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'paused' | 'failed' | 'running';
  data?: Record<string, any>;
  maxRetries?: number;
  retryCount?: number;
}

export interface JobExecution {
  id: string;
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  output?: any;
}

// In-memory job registry
const jobHandlers = new Map<string, (job: ScheduledJob) => Promise<any>>();
const runningJobs = new Set<string>();

/**
 * Parse cron expression and get next run time
 */
export function getNextRunTime(cronExpr: string, from: Date = new Date()): Date | null {
  // Simple cron parser (supports: * * * * * format)
  // Returns next occurrence
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const next = new Date(from);
  next.setSeconds(0, 0);

  // Simple implementation - add 1 hour for hourly, 1 day for daily
  if (minute === '0' && hour === '*') {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  } else if (minute === '0' && hour === '0') {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else if (minute === '0' && hour === '0' && dayOfMonth === '*') {
    next.setDate(next.getDate() + 7);
    next.setHours(0, 0, 0, 0);
  } else {
    // Default: run in 1 hour
    next.setHours(next.getHours() + 1);
  }

  return next;
}

/**
 * Register a job handler
 */
export function registerJobHandler(
  type: string,
  handler: (job: ScheduledJob) => Promise<any>
): void {
  jobHandlers.set(type, handler);
}

/**
 * Create a scheduled job
 */
export async function createJob(job: Omit<ScheduledJob, 'id'>): Promise<ScheduledJob> {
  const nextRun = getNextRunTime(job.schedule);
  
  const result = await query(
    `INSERT INTO scheduled_jobs (name, type, schedule, next_run, status, data, max_retries)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [job.name, job.type, job.schedule, nextRun, job.status || 'active', 
     JSON.stringify(job.data), job.maxRetries || 3]
  );

  return result.rows[0];
}

/**
 * Get all scheduled jobs
 */
export async function getJobs(status?: string): Promise<ScheduledJob[]> {
  let sql = `SELECT * FROM scheduled_jobs`;
  const params: any[] = [];
  
  if (status) {
    sql += ` WHERE status = $1`;
    params.push(status);
  }
  
  sql += ` ORDER BY next_run ASC`;
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get jobs due to run
 */
export async function getDueJobs(): Promise<ScheduledJob[]> {
  const result = await query(
    `SELECT * FROM scheduled_jobs 
     WHERE status = 'active' 
     AND (next_run IS NULL OR next_run <= NOW())
     ORDER BY next_run ASC`,
    []
  );
  return result.rows;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string, 
  status: ScheduledJob['status'],
  error?: string
): Promise<void> {
  await query(
    `UPDATE scheduled_jobs 
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, jobId]
  );
}

/**
 * Update job next run time
 */
export async function updateNextRun(jobId: string, schedule: string): Promise<void> {
  const nextRun = getNextRunTime(schedule);
  
  await query(
    `UPDATE scheduled_jobs 
     SET last_run = NOW(), next_run = $1, retry_count = 0
     WHERE id = $2`,
    [nextRun, jobId]
  );
}

/**
 * Increment retry count
 */
export async function incrementRetry(jobId: string): Promise<void> {
  await query(
    `UPDATE scheduled_jobs 
     SET retry_count = COALESCE(retry_count, 0) + 1
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<void> {
  await query(`DELETE FROM scheduled_jobs WHERE id = $1`, [jobId]);
}

/**
 * Execute a job
 */
export async function executeJob(job: ScheduledJob): Promise<JobExecution> {
  // Check if already running
  if (runningJobs.has(job.id)) {
    throw new Error('Job already running');
  }

  runningJobs.add(job.id);
  
  // Create execution record
  const execResult = await query(
    `INSERT INTO job_executions (job_id, status, started_at)
     VALUES ($1, 'running', NOW())
     RETURNING *`,
    [job.id]
  );
  const execution = execResult.rows[0];

  try {
    // Update job status
    await updateJobStatus(job.id, 'running');

    // Get handler
    const handler = jobHandlers.get(job.type);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.type}`);
    }

    // Execute
    const output = await handler(job);

    // Mark completed
    await query(
      `UPDATE job_executions 
       SET status = 'completed', completed_at = NOW(), output = $1
       WHERE id = $2`,
      [JSON.stringify(output), execution.id]
    );

    // Update job next run
    await updateNextRun(job.id, job.schedule);
    await updateJobStatus(job.id, 'active');

    return { ...execution, status: 'completed', completedAt: new Date(), output };

  } catch (error: any) {
    // Mark failed
    await query(
      `UPDATE job_executions 
       SET status = 'failed', completed_at = NOW(), error = $1
       WHERE id = $2`,
      [error.message, execution.id]
    );

    // Check retries
    const maxRetries = job.maxRetries || 3;
    const retryCount = (job.retryCount || 0) + 1;
    
    if (retryCount >= maxRetries) {
      await updateJobStatus(job.id, 'failed', error.message);
    } else {
      await incrementRetry(job.id);
      // Retry in 5 minutes
      await query(
        `UPDATE scheduled_jobs SET next_run = NOW() + INTERVAL '5 minutes'
         WHERE id = $1`,
        [job.id]
      );
    }

    throw error;

  } finally {
    runningJobs.delete(job.id);
  }
}

/**
 * Run scheduler tick - check and execute due jobs
 */
export async function runSchedulerTick(): Promise<{
  checked: number;
  executed: number;
  failed: number;
}> {
  const dueJobs = await getDueJobs();
  let executed = 0;
  let failed = 0;

  for (const job of dueJobs) {
    try {
      await executeJob(job);
      executed++;
    } catch (error) {
      failed++;
      console.error(`Job ${job.name} failed:`, error);
    }
  }

  return { checked: dueJobs.length, executed, failed };
}

/**
 * Get job execution history
 */
export async function getJobHistory(
  jobId: string, 
  limit: number = 10
): Promise<JobExecution[]> {
  const result = await query(
    `SELECT * FROM job_executions 
     WHERE job_id = $1 
     ORDER BY started_at DESC 
     LIMIT $2`,
    [jobId, limit]
  );
  return result.rows;
}

/**
 * Cancel running job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  if (!runningJobs.has(jobId)) {
    return false;
  }

  await query(
    `UPDATE job_executions 
     SET status = 'cancelled', completed_at = NOW()
     WHERE job_id = $1 AND status = 'running'`,
    [jobId]
  );

  runningJobs.delete(jobId);
  await updateJobStatus(jobId, 'active');
  
  return true;
}

// Pre-built job handlers

/**
 * Data export job handler
 */
registerJobHandler('export', async (job) => {
  const { type, format, filters, recipients } = job.data || {};
  
  // Generate export
  const exportModule = await import('../data-export');
  const result = await exportModule.exportData(type, format, filters);
  
  // Send to recipients
  if (recipients?.length > 0) {
    const emailModule = await import('../email');
    for (const recipient of recipients) {
      await emailModule.sendEmail({
        to: recipient,
        subject: `Scheduled Export: ${type}`,
        html: `<p>Your scheduled export is ready.</p>`,
        attachments: [{ filename: result.filename, content: result.data }],
      });
    }
  }
  
  return { filename: result.filename, recordCount: result.recordCount };
});

/**
 * Report generation job handler
 */
registerJobHandler('report', async (job) => {
  const { type, period } = job.data || {};
  
  // Generate report
  let report;
  switch (type) {
    case 'analytics':
      report = await generateAnalyticsReport(period);
      break;
    case 'performance':
      report = await generatePerformanceReport(period);
      break;
    case 'users':
      report = await generateUserReport(period);
      break;
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
  
  return report;
});

/**
 * Cleanup job handler
 */
registerJobHandler('cleanup', async (job) => {
  const { targets } = job.data || {};
  const results: Record<string, number> = {};
  
  if (targets?.includes('old_sessions')) {
    const result = await query(
      `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days'`
    );
    results.sessions = result.rowCount;
  }
  
  if (targets?.includes('old_logs')) {
    const result = await query(
      `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days'`
    );
    results.logs = result.rowCount;
  }
  
  if (targets?.includes('old_exports')) {
    const result = await query(
      `DELETE FROM export_downloads WHERE created_at < NOW() - INTERVAL '7 days'`
    );
    results.exports = result.rowCount;
  }
  
  return results;
});

// Helper functions for reports
async function generateAnalyticsReport(period: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : period === 'month' ? 30 : 1));
  
  const [pageViews, uniqueVisitors, topPages] = await Promise.all([
    query(`SELECT COUNT(*) FROM page_views WHERE created_at >= $1`, [startDate]),
    query(`SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE created_at >= $1`, [startDate]),
    query(`SELECT path, COUNT(*) as views FROM page_views WHERE created_at >= $1 GROUP BY path ORDER BY views DESC LIMIT 10`, [startDate]),
  ]);
  
  return {
    period,
    pageViews: parseInt(pageViews.rows[0].count),
    uniqueVisitors: parseInt(uniqueVisitors.rows[0].count),
    topPages: topPages.rows,
    generatedAt: new Date(),
  };
}

async function generatePerformanceReport(period: string) {
  // Performance metrics aggregation
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : period === 'month' ? 30 : 1));
  
  const metrics = await query(
    `SELECT metric_name, 
            AVG(metric_value) as avg_value,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value
     FROM performance_metrics 
     WHERE created_at >= $1 
     GROUP BY metric_name`,
    [startDate]
  );
  
  return {
    period,
    metrics: metrics.rows,
    generatedAt: new Date(),
  };
}

async function generateUserReport(period: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : period === 'month' ? 30 : 1));
  
  const [newUsers, activeUsers] = await Promise.all([
    query(`SELECT COUNT(*) FROM users WHERE created_at >= $1`, [startDate]),
    query(`SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE created_at >= $1`, [startDate]),
  ]);
  
  return {
    period,
    newUsers: parseInt(newUsers.rows[0].count),
    activeUsers: parseInt(activeUsers.rows[0].count),
    generatedAt: new Date(),
  };
}

/**
 * Start scheduler (for use with setInterval or cron)
 */
export function startScheduler(intervalMs: number = 60000): () => void {
  const interval = setInterval(() => {
    runSchedulerTick().catch(console.error);
  }, intervalMs);

  return () => clearInterval(interval);
}
