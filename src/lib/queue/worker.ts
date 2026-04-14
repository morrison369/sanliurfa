/**
 * Queue Worker Entry Point
 * Run: npm run worker
 */

import { createWorkers, scheduleRecurringJobs, closeQueues } from './index';

console.log('[Worker] Starting queue workers...');

// Create workers
const workers = createWorkers();

// Schedule recurring jobs
scheduleRecurringJobs().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...');
  await closeQueues();
  process.exit(0);
});

console.log(`[Worker] ${workers.length} workers started`);
