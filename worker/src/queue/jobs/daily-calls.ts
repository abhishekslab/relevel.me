/**
 * Daily calls job processors
 * Handles scheduling and processing of automated daily calls
 */

import { Job } from 'bull';
import {
  ScheduleCallsJobData,
  ProcessUserCallJobData,
  DEFAULT_JOB_OPTIONS,
  JOB_NAMES,
  getUsersToCallNow,
  initiateCall,
  createChildLogger,
  logSuccess,
  logError,
} from '@relevel-me/shared';
import { captureException } from '@relevel-me/shared';
import { dailyCallsQueue } from '../client';

const logger = createChildLogger({ service: 'DailyCallsJob' });

/**
 * Main job processor - schedules calls for users who need them
 */
export async function processScheduleCalls(job: Job<ScheduleCallsJobData>) {
  logger.info({ jobId: job.id, data: job.data }, 'Processing schedule-calls job');

  try {
    // Get users who should be called right now
    const users = await getUsersToCallNow();

    logger.info({ jobId: job.id, userCount: users.length }, `Found ${users.length} users to call`);

    if (users.length === 0) {
      return {
        success: true,
        usersScheduled: 0,
        message: 'No users need calls at this time',
      };
    }

    // Enqueue individual call jobs for each user
    logger.debug({ jobId: job.id, userIds: users.map(u => u.id) }, 'Enqueueing individual call jobs');

    const jobPromises = users.map((user) =>
      dailyCallsQueue.add(
        JOB_NAMES.PROCESS_USER_CALL,
        {
          userId: user.id,
          phone: user.phone,
          name: user.name,
          scheduledAt: new Date().toISOString(),
        } as ProcessUserCallJobData,
        {
          ...DEFAULT_JOB_OPTIONS,
          attempts: 2, // Only retry once for individual calls
        }
      )
    );

    const enqueuedJobs = await Promise.all(jobPromises);

    logger.info({
      jobId: job.id,
      usersScheduled: users.length,
      enqueuedJobIds: enqueuedJobs.map(j => j.id)
    }, `Enqueued ${users.length} call jobs`);

    logSuccess(logger, 'Schedule calls job completed', {
      jobId: job.id,
      usersScheduled: users.length
    });

    return {
      success: true,
      usersScheduled: users.length,
      users: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone })),
    };
  } catch (error) {
    logError(logger, 'Error processing schedule-calls job', error as Error, { jobId: job.id });
    captureException(error, { tags: { job: 'schedule-calls', jobId: job.id } });
    throw error; // Let Bull handle the retry
  }
}

/**
 * Process individual user call
 */
export async function processUserCall(job: Job<ProcessUserCallJobData>) {
  const { retryCount = 0, userId, phone, name, originalCallId } = job.data;

  logger.info({
    jobId: job.id,
    userId,
    userName: name,
    phone: `***${phone.slice(-4)}`,
    retryCount,
    originalCallId,
    attemptNumber: job.attemptsMade + 1
  }, `Processing user call${retryCount > 0 ? ` (retry ${retryCount}/2)` : ''}`);

  try {
    // Initiate the call
    const result = await initiateCall({ userId, phone, name, retryCount, originalCallId });

    if (!result.success) {
      logError(logger, 'Call initiation failed', new Error(result.error || 'Unknown error'), {
        jobId: job.id,
        userId,
        retryCount
      });
      captureException(new Error(result.error || 'Failed to initiate call'), {
        tags: { job: 'process-user-call', jobId: job.id, userId, retryCount }
      });
      throw new Error(result.error || 'Failed to initiate call');
    }

    logSuccess(logger, 'Call initiated successfully', {
      jobId: job.id,
      userId,
      callId: result.callId,
      vendorCallId: result.vendorCallId
    });

    return {
      success: true,
      callId: result.callId,
      vendorCallId: result.vendorCallId,
      message: result.message,
    };
  } catch (error) {
    logError(logger, 'Error processing user call job', error as Error, {
      jobId: job.id,
      userId,
      retryCount,
      attemptsMade: job.attemptsMade
    });
    captureException(error, {
      tags: { job: 'process-user-call', jobId: job.id, userId, retryCount: retryCount.toString() }
    });
    throw error;
  }
}

/**
 * Note: processJob router function removed
 * Now using named processors registered directly in worker.ts
 * This follows Bull's recommended pattern for handling multiple job types
 */
