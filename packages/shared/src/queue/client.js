"use strict";
/**
 * Bull queue client configuration
 * Manages Redis connection and queue initialization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyCallsQueue = void 0;
exports.checkQueueHealth = checkQueueHealth;
exports.closeQueue = closeQueue;
const bull_1 = __importDefault(require("bull"));
const types_1 = require("./types");
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
    }
    catch {
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
exports.dailyCallsQueue = new bull_1.default(types_1.QUEUE_NAMES.DAILY_CALLS, {
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
exports.dailyCallsQueue.on('error', (error) => {
    console.error('[Queue] Error:', error);
});
exports.dailyCallsQueue.on('waiting', (jobId) => {
    console.log(`[Queue] Job ${jobId} is waiting`);
});
exports.dailyCallsQueue.on('active', (job) => {
    console.log(`[Queue] Job ${job.id} (${job.name}) started`);
});
exports.dailyCallsQueue.on('completed', (job, result) => {
    console.log(`[Queue] Job ${job.id} (${job.name}) completed:`, result);
});
exports.dailyCallsQueue.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} (${job?.name}) failed:`, err.message);
});
exports.dailyCallsQueue.on('stalled', (job) => {
    console.warn(`[Queue] Job ${job.id} (${job.name}) stalled`);
});
// Helper function to check queue health
async function checkQueueHealth() {
    try {
        const [active, waiting, failed] = await Promise.all([
            exports.dailyCallsQueue.getActiveCount(),
            exports.dailyCallsQueue.getWaitingCount(),
            exports.dailyCallsQueue.getFailedCount(),
        ]);
        return {
            isHealthy: true,
            activeJobs: active,
            waitingJobs: waiting,
            failedJobs: failed,
        };
    }
    catch (error) {
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
async function closeQueue() {
    console.log('[Queue] Closing queue...');
    await exports.dailyCallsQueue.close();
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
