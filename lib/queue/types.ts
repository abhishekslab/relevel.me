/**
 * Queue job types and data structures for Bull queue system
 */

// Job names
export const QUEUE_NAMES = {
  DAILY_CALLS: 'daily-calls',
} as const;

export const JOB_NAMES = {
  SCHEDULE_CALLS: 'schedule-calls',
  PROCESS_USER_CALL: 'process-user-call',
} as const;

// Job data interfaces
export interface ScheduleCallsJobData {
  triggeredAt: string; // ISO timestamp
  manual?: boolean; // Whether this was manually triggered
}

export interface ProcessUserCallJobData {
  userId: string;
  phone: string;
  name: string | null;
  scheduledAt: string; // ISO timestamp
}

// Job options
export interface DailyCallsJobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

// Default job options
export const DEFAULT_JOB_OPTIONS: DailyCallsJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 second delay
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs for debugging
};

// Cron patterns
export const CRON_PATTERNS = {
  // Run every 5 minutes to check for users who need calls
  CHECK_USERS: '*/5 * * * *',
} as const;
