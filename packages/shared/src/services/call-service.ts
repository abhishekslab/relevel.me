/**
 * Call service - handles call initiation logic
 * Used by both API routes and background queue workers
 */

import { createClient } from '@supabase/supabase-js';
import { getCallProvider } from '../providers/factory';
import { config } from '../config';
import { dailyCallsQueue } from '../queue/client';
import { JOB_NAMES, ProcessUserCallJobData, DEFAULT_JOB_OPTIONS } from '../queue/types';

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

  try {
    const supabase = getServiceClient();

    // Validate phone number
    if (!phone) {
      return {
        success: false,
        error: 'Phone number is required',
      };
    }

    // Check for duplicate calls today (unless this is a retry)
    if (retryCount === 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingCall } = await supabase
        .from('calls')
        .select('id, status')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())
        .in('status', ['queued', 'ringing', 'in_progress', 'completed'])
        .single();

      if (existingCall) {
        console.log(`[CallService] User ${userId} already has a call today (${existingCall.status})`);
        return {
          success: false,
          error: 'User already has a call today',
          callId: existingCall.id,
          status: existingCall.status,
        };
      }
    } else {
      console.log(`[CallService] Retry attempt ${retryCount} for user ${userId}`);
    }

    // Get configured call provider (CallKaro, Vapi, etc.)
    const callProvider = getCallProvider();
    const agentId = process.env.CALLKARO_AGENT_ID || process.env.VAPI_ASSISTANT_ID || '';

    // Create call record in database
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
      console.error('[CallService] Database error:', dbError);
      return {
        success: false,
        error: 'Failed to create call record',
      };
    }

    console.log(`[CallService] Created call record ${call.id} for user ${userId}`);

    // Initiate call via configured provider
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
      console.error(`[CallService] ${callProvider.name} API error:`, providerResponse.error);

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

    // Update call record with vendor ID
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        vendor_call_id: providerResponse.vendorCallId,
        vendor_payload: providerResponse,
        status: 'ringing',
      })
      .eq('id', call.id);

    if (updateError) {
      console.error('[CallService] Failed to update call record:', updateError);
    }

    console.log(
      `[CallService] Call initiated successfully via ${callProvider.name}: ${call.id} -> ${providerResponse.vendorCallId}`
    );

    return {
      success: true,
      callId: call.id,
      vendorCallId: providerResponse.vendorCallId,
      status: providerResponse.status,
      message: providerResponse.message || `Call initiated to ${name || phone}`,
    };
  } catch (error) {
    console.error('[CallService] Unexpected error:', error);
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
  try {
    const supabase = getServiceClient();

    // Get all users who are enabled for calls and haven't been called today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone, name, local_tz, call_time, call_enabled')
      .eq('call_enabled', true)
      .not('phone', 'is', null);

    if (error || !users) {
      console.error('[CallService] Error fetching users:', error);
      return [];
    }

    // Filter users based on their local time and call_time
    const now = new Date();
    const usersToCall = [];

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
        usersToCall.push({
          id: user.id,
          phone: user.phone!,
          name: user.name,
          local_tz: userTimezone,
          call_time: userCallTime,
        });
      }
    }

    console.log(`[CallService] Found ${usersToCall.length} users to call now`);
    return usersToCall;
  } catch (error) {
    console.error('[CallService] Error in getUsersToCallNow:', error);
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

  // Check if status warrants a retry
  if (!RETRY_ON_STATUSES.includes(status)) {
    console.log(`[CallService] Call ${callId} status '${status}' - no retry needed`);
    return false;
  }

  // Check if we've already hit max retries
  if (retryCount >= MAX_RETRIES) {
    console.log(`[CallService] Call ${callId} - max retries (${MAX_RETRIES}) reached`);
    return false;
  }

  try {
    // Schedule retry job with 30-minute delay
    const nextRetryCount = retryCount + 1;
    const jobData: ProcessUserCallJobData = {
      userId,
      phone,
      name,
      scheduledAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
      retryCount: nextRetryCount,
      originalCallId: callId,
    };

    await dailyCallsQueue.add(JOB_NAMES.PROCESS_USER_CALL, jobData, {
      ...DEFAULT_JOB_OPTIONS,
      delay: RETRY_DELAY_MS, // 30 minutes
      attempts: 1, // Don't retry the retry job itself
    });

    console.log(
      `[CallService] Scheduled retry ${nextRetryCount}/${MAX_RETRIES} for call ${callId} in 30 minutes`
    );
    return true;
  } catch (error) {
    console.error(`[CallService] Failed to schedule retry for call ${callId}:`, error);
    return false;
  }
}
