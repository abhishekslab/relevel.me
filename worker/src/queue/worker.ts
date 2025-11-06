/**
 * Bull queue worker process
 * Consumes jobs from the daily-calls queue and processes them
 */

import { dailyCallsQueue } from './client';
import { processScheduleCalls, processUserCall } from './jobs/daily-calls';
import { JOB_NAMES, CRON_PATTERNS, ScheduleCallsJobData } from '@relevel-me/shared';

const CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '5', 10);

console.log('[Worker] Starting queue worker...');
console.log(`[Worker] Concurrency: ${CONCURRENCY}`);
console.log(`[Worker] Queue: ${dailyCallsQueue.name}`);

// Register named processors for each job type
// schedule-calls: Only 1 concurrent job needed (runs every 5 min via cron)
dailyCallsQueue.process(JOB_NAMES.SCHEDULE_CALLS, 1, async (job) => {
  return processScheduleCalls(job);
});

// process-user-call: Multiple concurrent jobs for parallel call processing
dailyCallsQueue.process(JOB_NAMES.PROCESS_USER_CALL, CONCURRENCY, async (job) => {
  return processUserCall(job);
});

console.log(`[Worker] Registered processor: ${JOB_NAMES.SCHEDULE_CALLS} (concurrency: 1)`);
console.log(`[Worker] Registered processor: ${JOB_NAMES.PROCESS_USER_CALL} (concurrency: ${CONCURRENCY})`);

// Setup recurring cron job to check for users who need calls
async function setupCronJobs() {
  console.log('[Worker] Setting up cron jobs...');

  // Remove any existing repeatable jobs to avoid duplicates
  const repeatableJobs = await dailyCallsQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await dailyCallsQueue.removeRepeatableByKey(job.key);
    console.log(`[Worker] Removed existing repeatable job: ${job.key}`);
  }

  // Add cron job to check for users every 5 minutes
  await dailyCallsQueue.add(
    JOB_NAMES.SCHEDULE_CALLS,
    {
      triggeredAt: new Date().toISOString(),
      manual: false,
    } as ScheduleCallsJobData,
    {
      repeat: {
        cron: CRON_PATTERNS.CHECK_USERS,
      },
      removeOnComplete: 10, // Keep last 10 completed schedule jobs
      removeOnFail: 50, // Keep last 50 failed schedule jobs
    }
  );

  console.log(`[Worker] Cron job scheduled: ${CRON_PATTERNS.CHECK_USERS}`);
}

// Initialize cron jobs
setupCronJobs().catch((error) => {
  console.error('[Worker] Failed to setup cron jobs:', error);
  process.exit(1);
});

// Graceful shutdown
async function shutdown() {
  console.log('[Worker] Shutting down...');

  try {
    // Wait for active jobs to complete
    // false = wait for active jobs to complete before closing
    await dailyCallsQueue.close(false);
    console.log('[Worker] Queue closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught Exception:', error);
  shutdown();
});

console.log('[Worker] Worker started successfully');
console.log('[Worker] Waiting for jobs...');
