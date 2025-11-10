import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCallProvider,
  scheduleRetryIfNeeded,
  createRequestLogger,
  logDatabaseError,
  logSuccess,
  logError,
} from '@relevel-me/shared';
import { captureException, addBreadcrumb } from '@sentry/nextjs';

/**
 * Generic Call Provider Webhook Handler
 * POST /api/webhooks/call
 *
 * Receives status updates from any configured call provider (CallKaro, Vapi, etc.)
 * Updates the calls table with status, transcript, and recording URL
 *
 * This replaces the provider-specific /api/webhooks/callkaro endpoint
 */

// Service role client for webhook (bypasses RLS)
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

export async function POST(req: NextRequest) {
  const logger = createRequestLogger();
  const startTime = Date.now();

  try {
    const rawPayload = await req.json();
    const callProvider = getCallProvider();

    logger.info({ provider: callProvider.name }, 'Webhook received');
    addBreadcrumb({
      message: 'Webhook received',
      data: { provider: callProvider.name },
    });

    // Verify webhook signature for security
    if (callProvider.verifyWebhookSignature) {
      const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-callkaro-signature') || '';
      const rawBody = JSON.stringify(rawPayload);

      logger.debug({ hasSignature: !!signature }, 'Verifying webhook signature');

      if (!callProvider.verifyWebhookSignature(rawBody, signature)) {
        logger.error({ provider: callProvider.name, signature }, 'Invalid webhook signature - rejecting request');
        captureException(new Error('Invalid webhook signature'), {
          tags: { provider: callProvider.name, operation: 'webhook_verification' }
        });
        // SECURITY FIX: Return 401 to reject unauthorized webhooks
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      logger.info('Webhook signature verified');
    } else {
      logger.warn({ provider: callProvider.name }, 'Provider does not support signature verification');
    }

    // Parse payload using provider's implementation
    let payload;
    try {
      payload = callProvider.parseWebhook(rawPayload);
      logger.info({
        vendorCallId: payload.vendorCallId,
        status: payload.status,
        hasTranscript: !!payload.transcript,
        hasRecording: !!payload.recordingUrl,
      }, `Webhook parsed: ${payload.status}`);
      addBreadcrumb({
        message: 'Webhook parsed',
        data: { status: payload.status, vendorCallId: payload.vendorCallId },
      });
    } catch (parseError) {
      logError(logger, 'Failed to parse webhook payload', parseError as Error, { provider: callProvider.name });
      captureException(parseError, {
        tags: { provider: callProvider.name, operation: 'webhook_parse' },
        contexts: { rawPayload }
      });
      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Find the call by vendor_call_id (include phone for retry scheduling)
    logger.debug({ vendorCallId: payload.vendorCallId }, 'Looking up call by vendor ID');
    const { data: call, error: findError } = await supabase
      .from('calls')
      .select('id, user_id, status, to_number')
      .eq('vendor_call_id', payload.vendorCallId)
      .single();

    if (findError || !call) {
      logDatabaseError(logger, 'SELECT', 'calls', findError, { vendorCallId: payload.vendorCallId });
      logger.warn({ vendorCallId: payload.vendorCallId }, 'Call not found for webhook');
      // Still return 200 to avoid webhook retries
      return NextResponse.json({
        success: false,
        error: 'Call not found',
      });
    }

    logger.info({ callId: call.id, userId: call.user_id, currentStatus: call.status }, 'Call found');

    // Prepare update data
    const updateData: any = {
      status: payload.status,
      vendor_payload: rawPayload, // Store raw payload for debugging
    };

    // Add transcript if available
    if (payload.transcript) {
      updateData.transcript = payload.transcript;
      logger.info({ callId: call.id, transcriptLength: payload.transcript.length }, 'Transcript received');
    }

    // Add recording URL if available
    if (payload.recordingUrl) {
      updateData.recording_url = payload.recordingUrl;
      logger.info({ callId: call.id, recordingUrl: payload.recordingUrl }, 'Recording URL received');
    }

    // Add duration if available
    if (payload.duration) {
      updateData.duration = payload.duration;
    }

    // Update timestamp if status is completed/failed
    if (payload.status === 'completed' || payload.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    logger.info({
      callId: call.id,
      oldStatus: call.status,
      newStatus: payload.status,
      hasTranscript: !!payload.transcript,
      hasRecording: !!payload.recordingUrl,
    }, 'Updating call status');

    // Update the call record
    const { error: updateError } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', call.id);

    if (updateError) {
      logDatabaseError(logger, 'UPDATE', 'calls', updateError, {
        callId: call.id,
        newStatus: payload.status
      });
      captureException(updateError, {
        tags: { operation: 'webhook_update_call', callId: call.id }
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Database update failed',
        },
        { status: 500 }
      );
    }

    logSuccess(logger, `Call updated to ${payload.status}`, { callId: call.id, userId: call.user_id });
    addBreadcrumb({
      message: 'Call status updated',
      data: { callId: call.id, status: payload.status },
    });

    // Schedule retry if call failed/was unanswered
    // Count how many calls were made today to determine retry count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: callsToday } = await supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', call.user_id)
      .gte('created_at', todayStart.toISOString());

    // Get user info for retry scheduling
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', call.user_id)
      .single();

    // Retry count is current number of calls - 1 (since this call is already counted)
    const currentRetryCount = (callsToday || 1) - 1;

    logger.info({
      callId: call.id,
      status: payload.status,
      callsToday,
      retryCount: currentRetryCount
    }, 'Checking if retry needed');

    const retryScheduled = await scheduleRetryIfNeeded({
      callId: call.id,
      userId: call.user_id,
      phone: call.to_number,
      name: user?.name || null,
      status: payload.status,
      retryCount: currentRetryCount,
    });

    if (retryScheduled) {
      logger.info({ callId: call.id, userId: call.user_id }, 'Retry scheduled for failed/unanswered call');
      addBreadcrumb({
        message: 'Retry scheduled',
        data: { callId: call.id },
      });
    }

    // TODO: Process transcript and create checkpoints/insights
    // if (payload.status === 'completed' && payload.transcript) {
    //   await processTranscript(call.user_id, call.id, payload.transcript);
    // }

    const duration = Date.now() - startTime;
    logSuccess(logger, 'Webhook processed successfully', {
      callId: call.id,
      status: payload.status,
      retryScheduled,
      duration
    });

    return NextResponse.json({
      success: true,
      call_id: call.id,
      status: payload.status,
      retry_scheduled: retryScheduled,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(logger, 'Unexpected error processing webhook', error as Error, { duration });
    captureException(error, { tags: { operation: 'webhook_processing' } });
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
