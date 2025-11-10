/**
 * Call service - handles call initiation logic
 * Used by both API routes and background queue workers
 */

import { createClient } from '@supabase/supabase-js';
import { getCallProvider } from '../providers/factory';
import { config } from '../config';
import { dailyCallsQueue } from '../queue/client';
import { JOB_NAMES, ProcessUserCallJobData, DEFAULT_JOB_OPTIONS } from '../queue/types';
import {
  createChildLogger,
  logDatabaseError,
  logSuccess,
  logError,
  logApiRequest,
} from '../logger';
import { captureException } from '../sentry';

// Create service logger
const logger = createChildLogger({ service: 'CallService' });

// Retry configuration constants
const MAX_RETRIES = 2; // Total of 3 attempts (1 initial + 2 retries)
const RETRY_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const RETRY_ON_STATUSES = ['failed', 'no_answer', 'busy', 'no-answer'];

// Service role client for background jobs (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface InitiateCallParams {
  userId: string;
  phone: string;
  name?: string | null;
  retryCount?: number; // Number of previous attempts (0 = first call)
  originalCallId?: string; // ID of the original call (if this is a retry)
}

export interface InitiateCallResult {
  success: boolean;
  callId?: string;
  vendorCallId?: string;
  status?: string;
  message?: string;
  error?: string;
}

/**
 * Initiates a call for a user
 * This function is used by both manual triggers (API) and automated queue workers
 */
export async function initiateCall(params: InitiateCallParams): Promise<InitiateCallResult> {
  const { userId, phone, name, retryCount = 0, originalCallId } = params;

  logger.info({
    userId,
    phone: `***${phone.slice(-4)}`,
    retryCount,
    originalCallId
  }, 'Initiating call');

  try {
    const supabase = getServiceClient();

    // Validate phone number
    if (!phone) {
      logger.warn({ userId }, 'Phone number is required but not provided');
      return {
        success: false,
        error: 'Phone number is required',
      };
    }

    // Check for duplicate calls today (unless this is a retry)
    if (retryCount === 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      logger.debug({ userId, todayStart: todayStart.toISOString() }, 'Checking for duplicate calls');

      const { data: existingCall } = await supabase
        .from('calls')
        .select('id, status')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())
        .in('status', ['queued', 'ringing', 'in_progress', 'completed'])
        .single();

      if (existingCall) {
        logger.info({
          userId,
          existingCallId: existingCall.id,
          status: existingCall.status
        }, 'User already has a call today - skipping');
        return {
          success: false,
          error: 'User already has a call today',
          callId: existingCall.id,
          status: existingCall.status,
        };
      }

      logger.debug({ userId }, 'No duplicate calls found');
    } else {
      logger.info({ userId, retryCount, originalCallId }, `Retry attempt ${retryCount}`);
    }

    // Get configured call provider (CallKaro, Vapi, etc.)
    const callProvider = getCallProvider();
    const agentId = process.env.CALLKARO_AGENT_ID || process.env.VAPI_ASSISTANT_ID || '';

    logger.debug({ provider: callProvider.name, agentId }, 'Using call provider');

    // Create call record in database
    logger.info({ userId, phone: `***${phone.slice(-4)}`, agentId }, 'Creating call record');
    const { data: call, error: dbError } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        to_number: phone,
        agent_id: agentId,
        scheduled_at: new Date().toISOString(),
        status: 'queued',
      })
      .select()
      .single();

    if (dbError || !call) {
      logDatabaseError(logger, 'INSERT', 'calls', dbError, { userId, phone: `***${phone.slice(-4)}` });
      captureException(dbError, { tags: { operation: 'create_call', userId } });
      return {
        success: false,
        error: 'Failed to create call record',
      };
    }

    logSuccess(logger, 'Call record created', { callId: call.id, userId });

    // Initiate call via configured provider
    logApiRequest(logger, 'POST', `${callProvider.name}.initiateCall`, {
      callId: call.id,
      userId,
      phone: `***${phone.slice(-4)}`,
      agentId
    });

    const providerResponse = await callProvider.initiateCall({
      toNumber: phone,
      agentId: agentId,
      metadata: {
        call_id: call.id,
        user_id: userId,
        name: name || undefined,
      },
    });

    if (!providerResponse.success) {
      logError(logger, `${callProvider.name} API call failed`, new Error(providerResponse.error || 'Unknown error'), {
        callId: call.id,
        userId,
        provider: callProvider.name
      });
      captureException(new Error(`${callProvider.name} API error: ${providerResponse.error}`), {
        tags: { operation: 'initiate_call_provider', callId: call.id, provider: callProvider.name }
      });

      // Update call status to failed
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          vendor_payload: { error: providerResponse.error },
        })
        .eq('id', call.id);

      return {
        success: false,
        error: `Failed to initiate call with ${callProvider.name}`,
        callId: call.id,
      };
    }

    logger.info({
      callId: call.id,
      vendorCallId: providerResponse.vendorCallId,
      provider: callProvider.name
    }, 'Provider call initiated successfully');

    // Update call record with vendor ID
    logger.debug({ callId: call.id, vendorCallId: providerResponse.vendorCallId }, 'Updating call with vendor ID');
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        vendor_call_id: providerResponse.vendorCallId,
        vendor_payload: providerResponse,
        status: 'ringing',
      })
      .eq('id', call.id);

    if (updateError) {
      // CRITICAL: This should be treated as an error since the call was made but DB is out of sync
      logDatabaseError(logger, 'UPDATE', 'calls', updateError, {
        callId: call.id,
        vendorCallId: providerResponse.vendorCallId
      });
      captureException(updateError, {
        tags: { operation: 'update_call_vendor_id', callId: call.id, severity: 'critical' }
      });
    }

    logSuccess(logger, 'Call initiated successfully', {
      callId: call.id,
      vendorCallId: providerResponse.vendorCallId,
      userId,
      provider: callProvider.name
    });

    return {
      success: true,
      callId: call.id,
      vendorCallId: providerResponse.vendorCallId,
      status: providerResponse.status,
      message: providerResponse.message || `Call initiated to ${name || phone}`,
    };
  } catch (error) {
    logError(logger, 'Unexpected error in initiateCall', error as Error, { userId, phone: `***${phone.slice(-4)}` });
    captureException(error, { tags: { operation: 'initiate_call', userId } });
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Get users who should be called at the current time
 * Respects user timezone and call_time preferences
 */
export async function getUsersToCallNow(): Promise<
  Array<{
    id: string;
    phone: string;
    name: string | null;
    local_tz: string;
    call_time: string;
  }>
> {
  logger.info('Fetching users to call now');

  try {
    const supabase = getServiceClient();

    // Get all users who are enabled for calls and haven't been called today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    logger.debug({
      todayStart: todayStart.toISOString(),
      filters: { call_enabled: true, phone_not_null: true }
    }, 'Querying users with calls enabled');

    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone, name, local_tz, call_time, call_enabled')
      .eq('call_enabled', true)
      .not('phone', 'is', null);

    if (error || !users) {
      logDatabaseError(logger, 'SELECT', 'users', error);
      captureException(error, { tags: { operation: 'get_users_to_call' } });
      return [];
    }

    logger.info({ totalUsers: users.length }, 'Users fetched, filtering by timezone and call window');

    // Filter users based on their local time and call_time
    const now = new Date();
    const usersToCall = [];
    let skippedDuplicate = 0;
    let skippedOutsideWindow = 0;

    for (const user of users) {
      // Check if user already has a call today
      const { data: existingCall } = await supabase
        .from('calls')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())
        .in('status', ['queued', 'ringing', 'in_progress', 'completed'])
        .single();

      if (existingCall) {
        skippedDuplicate++;
        logger.debug({ userId: user.id, existingCallId: existingCall.id }, 'User already has call today - skipping');
        continue; // Skip users who already have a call today
      }

      // Convert current UTC time to user's local timezone
      const userTimezone = user.local_tz || config.defaultTimezone;
      const userLocalTime = new Date(
        now.toLocaleString('en-US', { timeZone: userTimezone })
      );

      const currentHour = userLocalTime.getHours();
      const currentMinute = userLocalTime.getMinutes();

      // Parse user's call_time (format: "HH:MM:SS")
      const userCallTime = user.call_time || config.defaultCallTime;
      const [callHour, callMinute] = userCallTime.split(':').map(Number);

      // Check if current time is within configured window of call_time
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const callTotalMinutes = callHour * 60 + callMinute;

      if (
        currentTotalMinutes >= callTotalMinutes &&
        currentTotalMinutes < callTotalMinutes + config.callTimeWindowMinutes
      ) {
        logger.debug({
          userId: user.id,
          timezone: userTimezone,
          localTime: `${currentHour}:${currentMinute}`,
          callTime: userCallTime,
          window: config.callTimeWindowMinutes
        }, 'User is within call window - adding to list');

        usersToCall.push({
          id: user.id,
          phone: user.phone!,
          name: user.name,
          local_tz: userTimezone,
          call_time: userCallTime,
        });
      } else {
        skippedOutsideWindow++;
        logger.debug({
          userId: user.id,
          localTime: `${currentHour}:${currentMinute}`,
          callTime: userCallTime,
          window: config.callTimeWindowMinutes
        }, 'User outside call window - skipping');
      }
    }

    logSuccess(logger, 'User filtering complete', {
      totalUsers: users.length,
      usersToCall: usersToCall.length,
      skippedDuplicate,
      skippedOutsideWindow
    });

    return usersToCall;
  } catch (error) {
    logError(logger, 'Error in getUsersToCallNow', error as Error);
    captureException(error, { tags: { operation: 'get_users_to_call' } });
    return [];
  }
}

/**
 * Schedule a retry call if the previous attempt failed/was unanswered
 * Returns true if retry was scheduled, false otherwise
 */
export async function scheduleRetryIfNeeded(params: {
  callId: string;
  userId: string;
  phone: string;
  name: string | null;
  status: string;
  retryCount?: number;
}): Promise<boolean> {
  const { callId, userId, phone, name, status, retryCount = 0 } = params;

  logger.info({
    callId,
    userId,
    status,
    retryCount
  }, 'Checking if retry needed');

  // Check if status warrants a retry
  if (!RETRY_ON_STATUSES.includes(status)) {
    logger.info({ callId, status }, 'Status does not warrant retry');
    return false;
  }

  // Check if we've already hit max retries
  if (retryCount >= MAX_RETRIES) {
    logger.warn({ callId, retryCount, maxRetries: MAX_RETRIES }, 'Max retries reached - not scheduling retry');
    return false;
  }

  try {
    // Schedule retry job with 30-minute delay
    const nextRetryCount = retryCount + 1;
    const scheduledTime = new Date(Date.now() + RETRY_DELAY_MS);
    const jobData: ProcessUserCallJobData = {
      userId,
      phone,
      name,
      scheduledAt: scheduledTime.toISOString(),
      retryCount: nextRetryCount,
      originalCallId: callId,
    };

    logger.info({
      callId,
      userId,
      nextRetryCount,
      maxRetries: MAX_RETRIES,
      delayMinutes: RETRY_DELAY_MS / 60000,
      scheduledTime: scheduledTime.toISOString()
    }, 'Scheduling retry job');

    await dailyCallsQueue.add(JOB_NAMES.PROCESS_USER_CALL, jobData, {
      ...DEFAULT_JOB_OPTIONS,
      delay: RETRY_DELAY_MS, // 30 minutes
      attempts: 1, // Don't retry the retry job itself
    });

    logSuccess(logger, `Retry scheduled: ${nextRetryCount}/${MAX_RETRIES}`, {
      callId,
      userId,
      scheduledTime: scheduledTime.toISOString()
    });

    return true;
  } catch (error) {
    logError(logger, 'Failed to schedule retry', error as Error, { callId, userId });
    captureException(error, {
      tags: { operation: 'schedule_retry', callId, userId, severity: 'high' }
    });
    return false;
  }
}
