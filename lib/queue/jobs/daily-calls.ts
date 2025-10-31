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
} from '../types';
import { getUsersToCallNow, initiateCall } from '@/lib/services/call-service';
import { dailyCallsQueue } from '../client';

/**
 * Main job processor - schedules calls for users who need them
 */
export async function processScheduleCalls(job: Job<ScheduleCallsJobData>) {
  console.log(`[Job:${job.id}] Processing schedule-calls job`, job.data);

  try {
    // Get users who should be called right now
    const users = await getUsersToCallNow();

    console.log(`[Job:${job.id}] Found ${users.length} users to call`);

    if (users.length === 0) {
      return {
        success: true,
        usersScheduled: 0,
        message: 'No users need calls at this time',
      };
    }

    // Enqueue individual call jobs for each user
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

    await Promise.all(jobPromises);

    console.log(`[Job:${job.id}] Enqueued ${users.length} call jobs`);

    return {
      success: true,
      usersScheduled: users.length,
      users: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone })),
    };
  } catch (error) {
    console.error(`[Job:${job.id}] Error processing schedule-calls:`, error);
    throw error; // Let Bull handle the retry
  }
}

/**
 * Process individual user call
 */
export async function processUserCall(job: Job<ProcessUserCallJobData>) {
  console.log(`[Job:${job.id}] Processing user call for ${job.data.name || job.data.userId}`);

  try {
    const { userId, phone, name } = job.data;

    // Initiate the call
    const result = await initiateCall({ userId, phone, name });

    if (!result.success) {
      console.error(`[Job:${job.id}] Call initiation failed:`, result.error);
      throw new Error(result.error || 'Failed to initiate call');
    }

    console.log(`[Job:${job.id}] Call initiated successfully:`, {
      callId: result.callId,
      vendorCallId: result.vendorCallId,
    });

    return {
      success: true,
      callId: result.callId,
      vendorCallId: result.vendorCallId,
      message: result.message,
    };
  } catch (error) {
    console.error(`[Job:${job.id}] Error processing user call:`, error);
    throw error;
  }
}

/**
 * Note: processJob router function removed
 * Now using named processors registered directly in worker.ts
 * This follows Bull's recommended pattern for handling multiple job types
 */
