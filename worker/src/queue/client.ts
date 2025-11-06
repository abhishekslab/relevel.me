/**
 * Bull queue client configuration
 * Manages Redis connection and queue initialization
 */

import Queue from 'bull';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@relevel-me/shared';

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL to extract connection options
function getRedisConfig() {
  try {
    const url = new URL(REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Required for Bull
      enableReadyCheck: false,
    };
  } catch {
    // Fallback to localhost if URL parsing fails
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}

// Create Redis client for Bull
const redisConfig = getRedisConfig();

console.log(`[Queue] Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`);

// Daily calls queue
export const dailyCallsQueue = new Queue(QUEUE_NAMES.DAILY_CALLS, {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Queue event handlers for monitoring
dailyCallsQueue.on('error', (error) => {
  console.error('[Queue] Error:', error);
});

dailyCallsQueue.on('waiting', (jobId) => {
  console.log(`[Queue] Job ${jobId} is waiting`);
});

dailyCallsQueue.on('active', (job) => {
  console.log(`[Queue] Job ${job.id} (${job.name}) started`);
});

dailyCallsQueue.on('completed', (job, result) => {
  console.log(`[Queue] Job ${job.id} (${job.name}) completed:`, result);
});

dailyCallsQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

dailyCallsQueue.on('stalled', (job) => {
  console.warn(`[Queue] Job ${job.id} (${job.name}) stalled`);
});

// Helper function to check queue health
export async function checkQueueHealth(): Promise<{
  isHealthy: boolean;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
}> {
  try {
    const [active, waiting, failed] = await Promise.all([
      dailyCallsQueue.getActiveCount(),
      dailyCallsQueue.getWaitingCount(),
      dailyCallsQueue.getFailedCount(),
    ]);

    return {
      isHealthy: true,
      activeJobs: active,
      waitingJobs: waiting,
      failedJobs: failed,
    };
  } catch (error) {
    console.error('[Queue] Health check failed:', error);
    return {
      isHealthy: false,
      activeJobs: 0,
      waitingJobs: 0,
      failedJobs: 0,
    };
  }
}

// Graceful shutdown
export async function closeQueue() {
  console.log('[Queue] Closing queue...');
  await dailyCallsQueue.close();
  console.log('[Queue] Queue closed');
}

// Handle process signals
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await closeQueue();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await closeQueue();
    process.exit(0);
  });
}
