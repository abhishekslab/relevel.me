"use strict";
/**
 * Queue job types and data structures for Bull queue system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRON_PATTERNS = exports.DEFAULT_JOB_OPTIONS = exports.JOB_NAMES = exports.QUEUE_NAMES = void 0;
// Job names
exports.QUEUE_NAMES = {
    DAILY_CALLS: 'daily-calls',
};
exports.JOB_NAMES = {
    SCHEDULE_CALLS: 'schedule-calls',
    PROCESS_USER_CALL: 'process-user-call',
};
// Default job options
exports.DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
};
// Cron patterns
exports.CRON_PATTERNS = {
    // Run every 5 minutes to check for users who need calls
    CHECK_USERS: '*/5 * * * *',
};
