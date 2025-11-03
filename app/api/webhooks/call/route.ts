import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCallProvider } from '@relevel-me/shared';

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
  try {
    const rawPayload = await req.json();
    const callProvider = getCallProvider();

    // Optional: Verify webhook signature for security
    if (callProvider.verifyWebhookSignature) {
      const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-callkaro-signature') || '';
      const rawBody = JSON.stringify(rawPayload);

      if (!callProvider.verifyWebhookSignature(rawBody, signature)) {
        console.warn(`[Webhook:${callProvider.name}] Invalid webhook signature`);
        // Still return 200 to avoid webhook retries, but log the issue
        // In production, you might want to return 401
        // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse payload using provider's implementation
    const payload = callProvider.parseWebhook(rawPayload);

    console.log(`[Webhook:${callProvider.name}] Received webhook:`, {
      vendor_call_id: payload.vendorCallId,
      status: payload.status,
      metadata: payload.metadata,
    });

    const supabase = getServiceClient();

    // Find the call by vendor_call_id
    const { data: call, error: findError } = await supabase
      .from('calls')
      .select('id, user_id, status')
      .eq('vendor_call_id', payload.vendorCallId)
      .single();

    if (findError || !call) {
      console.error(`[Webhook:${callProvider.name}] Call not found:`, payload.vendorCallId);
      // Still return 200 to avoid webhook retries
      return NextResponse.json({
        success: false,
        error: 'Call not found',
      });
    }

    // Prepare update data
    const updateData: any = {
      status: payload.status,
      vendor_payload: rawPayload, // Store raw payload for debugging
    };

    // Add transcript if available
    if (payload.transcript) {
      updateData.transcript = payload.transcript;
    }

    // Add recording URL if available
    if (payload.recordingUrl) {
      updateData.recording_url = payload.recordingUrl;
    }

    // Add duration if available
    if (payload.duration) {
      updateData.duration = payload.duration;
    }

    // Update timestamp if status is completed/failed
    if (payload.status === 'completed' || payload.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the call record
    const { error: updateError } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', call.id);

    if (updateError) {
      console.error(`[Webhook:${callProvider.name}] Failed to update call:`, updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database update failed',
        },
        { status: 500 }
      );
    }

    console.log(`[Webhook:${callProvider.name}] Updated call ${call.id} to status: ${payload.status}`);

    // TODO: Process transcript and create checkpoints/insights
    // if (payload.status === 'completed' && payload.transcript) {
    //   await processTranscript(call.user_id, call.id, payload.transcript);
    // }

    return NextResponse.json({
      success: true,
      call_id: call.id,
      status: payload.status,
    });
  } catch (error) {
    console.error('[Webhook:Call] Error processing webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
