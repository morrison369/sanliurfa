/**
 * Queue Worker Entry Point
 * Run: npm run worker
 */

import { createWorkers, scheduleRecurringJobs, closeQueues } from './index';
import { logger } from '../logging';

logger.info('[Worker] Starting queue workers...');

// Create workers
const workers = createWorkers();

// Schedule recurring jobs
scheduleRecurringJobs().catch((err) => logger.error('Recurring jobs scheduling failed', err instanceof Error ? err : new Error(String(err))));

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Worker] Shutting down...');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Worker] Shutting down...');
  await closeQueues();
  process.exit(0);
});

logger.info(`[Worker] ${workers.length} workers started`);
