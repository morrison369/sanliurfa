/**
 * Job Scheduler
 * Cron jobs for automated tasks
 */

import { query } from '../postgres';
import { getCache, setCache } from '../cache';

type JobHandler = () => Promise<void>;

interface Job {
  name: string;
  schedule: string; // cron expression
  handler: JobHandler;
  lastRun?: Date;
}

const jobs: Map<string, Job> = new Map();

/**
 * Register a job
 */
export function registerJob(name: string, schedule: string, handler: JobHandler): void {
  jobs.set(name, { name, schedule, handler });
  console.log(`📅 Job registered: ${name}`);
}

/**
 * Run a job manually
 */
export async function runJob(name: string): Promise<{ success: boolean; error?: string }> {
  const job = jobs.get(name);
  if (!job) {
    return { success: false, error: 'Job not found' };
  }
  
  // Lock to prevent concurrent runs
  const lockKey = `job:lock:${name}`;
  const locked = await getCache(lockKey);
  if (locked) {
    return { success: false, error: 'Job already running' };
  }
  
  await setCache(lockKey, true, 300); // 5 min lock
  
  try {
    console.log(`🚀 Running job: ${name}`);
    const startTime = Date.now();
    
    await job.handler();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Job completed: ${name} (${duration}ms)`);
    
    // Update last run time
    job.lastRun = new Date();
    await logJobRun(name, true, duration);
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Job failed: ${name}`, error);
    await logJobRun(name, false, 0, error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    await setCache(lockKey, false, 1);
  }
}

/**
 * Log job execution
 */
async function logJobRun(
  name: string,
  success: boolean,
  duration: number,
  error?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO job_logs (name, success, duration_ms, error, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [name, success, duration, error || null]
    );
  } catch (err) {
    console.error('Failed to log job run:', err);
  }
}

/**
 * Get job status
 */
export function getJobStatus(): Array<{ name: string; schedule: string; lastRun?: Date }> {
  return Array.from(jobs.values()).map(job => ({
    name: job.name,
    schedule: job.schedule,
    lastRun: job.lastRun,
  }));
}

/**
 * Clean old data
 */
export async function cleanupOldData(): Promise<void> {
  // Clean old notifications (90 days)
  await query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'`
  );
  
  // Clean old analytics (1 year)
  await query(
    `DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '1 year'`
  );
  
  // Clean old job logs (30 days)
  await query(
    `DELETE FROM job_logs WHERE created_at < NOW() - INTERVAL '30 days'`
  );
  
  // Clean old sessions (expired)
  await query(
    `DELETE FROM sessions WHERE expires_at < NOW()`
  );
  
  console.log('🧹 Old data cleaned up');
}

/**
 * Backup database
 */
export async function backupDatabase(): Promise<void> {
  // This would typically trigger pg_dump or similar
  // For now, just log
  console.log('💾 Database backup triggered');
  // TODO: Implement actual backup logic
}

/**
 * Update trending places
 */
export async function updateTrendingPlaces(): Promise<void> {
  await query(
    `UPDATE places SET trending_score = (
      SELECT COALESCE(SUM(CASE 
        WHEN created_at > NOW() - INTERVAL '7 days' THEN 3
        WHEN created_at > NOW() - INTERVAL '30 days' THEN 2
        ELSE 1
      END), 0)
      FROM reviews 
      WHERE place_id = places.id 
      AND created_at > NOW() - INTERVAL '90 days'
    )`
  );
  
  console.log('📈 Trending places updated');
}

/**
 * Send scheduled notifications
 */
export async function sendScheduledNotifications(): Promise<void> {
  // Process pending notifications in batches
  const batchSize = 100;
  
  // This would integrate with email/push services
  console.log('📧 Scheduled notifications processed');
}

/**
 * Refresh materialized views
 */
export async function refreshMaterializedViews(): Promise<void> {
  // If we had materialized views, refresh them here
  console.log('🔄 Materialized views refreshed');
}

// Register default jobs
registerJob('cleanup', '0 2 * * *', cleanupOldData); // Daily at 2 AM
registerJob('backup', '0 3 * * 0', backupDatabase); // Weekly on Sunday at 3 AM
registerJob('trending', '0 */6 * * *', updateTrendingPlaces); // Every 6 hours
registerJob('notifications', '*/5 * * * *', sendScheduledNotifications); // Every 5 minutes
registerJob('refresh-views', '0 4 * * *', refreshMaterializedViews); // Daily at 4 AM
