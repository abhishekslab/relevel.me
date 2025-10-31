/**
 * Call service - handles call initiation logic
 * Used by both API routes and background queue workers
 */

import { createClient } from '@supabase/supabase-js';

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
  const { userId, phone, name } = params;

  try {
    const supabase = getServiceClient();

    // Validate phone number
    if (!phone) {
      return {
        success: false,
        error: 'Phone number is required',
      };
    }

    // Check for duplicate calls today
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

    // Create call record in database
    const { data: call, error: dbError } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        to_number: phone,
        agent_id: process.env.CALLKARO_AGENT_ID || 'artha-daily-journal-v1',
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

    // Initiate call via CallKaro API
    const callkaroResponse = await fetch(
      `${process.env.CALLKARO_BASE_URL}/call/outbound`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.CALLKARO_API_KEY!,
        },
        body: JSON.stringify({
          to_number: phone,
          agent_id: process.env.CALLKARO_AGENT_ID,
          metadata: {
            call_id: call.id,
            user_id: userId,
            name: name || undefined,
          },
        }),
      }
    );

    if (!callkaroResponse.ok) {
      const errorText = await callkaroResponse.text();
      console.error('[CallService] CallKaro API error:', errorText);

      // Update call status to failed
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          vendor_payload: { error: errorText },
        })
        .eq('id', call.id);

      return {
        success: false,
        error: 'Failed to initiate call with CallKaro',
        callId: call.id,
      };
    }

    const callkaroData = await callkaroResponse.json();

    // Update call record with vendor ID
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        vendor_call_id: callkaroData.call_id,
        vendor_payload: callkaroData,
        status: 'ringing',
      })
      .eq('id', call.id);

    if (updateError) {
      console.error('[CallService] Failed to update call record:', updateError);
    }

    console.log(`[CallService] Call initiated successfully: ${call.id} -> ${callkaroData.call_id}`);

    return {
      success: true,
      callId: call.id,
      vendorCallId: callkaroData.call_id,
      status: callkaroData.status,
      message: callkaroData.message || `Call initiated to ${name || phone}`,
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
      const userLocalTime = new Date(
        now.toLocaleString('en-US', { timeZone: user.local_tz || 'Asia/Kolkata' })
      );

      const currentHour = userLocalTime.getHours();
      const currentMinute = userLocalTime.getMinutes();

      // Parse user's call_time (format: "HH:MM:SS")
      const [callHour, callMinute] = (user.call_time || '20:30:00').split(':').map(Number);

      // Check if current time is within 5 minutes of call_time
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const callTotalMinutes = callHour * 60 + callMinute;

      if (
        currentTotalMinutes >= callTotalMinutes &&
        currentTotalMinutes < callTotalMinutes + 5
      ) {
        usersToCall.push({
          id: user.id,
          phone: user.phone!,
          name: user.name,
          local_tz: user.local_tz || 'Asia/Kolkata',
          call_time: user.call_time || '20:30:00',
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
