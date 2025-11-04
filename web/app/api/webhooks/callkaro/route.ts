import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * CallKaro webhook handler
 * POST /api/webhooks/callkaro
 *
 * Receives status updates from CallKaro about call progress
 * Updates the calls table with status, transcript, and recording URL
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

interface CallKaroWebhookPayload {
  call_id: string; // CallKaro's call ID
  status: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | 'busy';
  metadata?: {
    call_id?: string; // Our internal call ID
    user_id?: string;
    name?: string;
  };
  transcript?: string;
  recording_url?: string;
  duration?: number;
  error_message?: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    // Optional: Verify webhook signature for security
    // const signature = req.headers.get('x-callkaro-signature');
    // const webhookSecret = process.env.CALLKARO_WEBHOOK_SECRET;
    // if (webhookSecret && !verifySignature(signature, webhookSecret)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const payload: CallKaroWebhookPayload = await req.json();

    console.log('[Webhook:CallKaro] Received webhook:', {
      vendor_call_id: payload.call_id,
      status: payload.status,
      metadata: payload.metadata,
    });

    const supabase = getServiceClient();

    // Find the call by vendor_call_id
    const { data: call, error: findError } = await supabase
      .from('calls')
      .select('id, user_id, status')
      .eq('vendor_call_id', payload.call_id)
      .single();

    if (findError || !call) {
      console.error('[Webhook:CallKaro] Call not found:', payload.call_id);
      // Still return 200 to avoid webhook retries
      return NextResponse.json({
        success: false,
        error: 'Call not found',
      });
    }

    // Prepare update data
    const updateData: any = {
      status: payload.status,
      last_status_at: new Date().toISOString(),
      vendor_payload: payload,
    };

    // Add transcript if provided
    if (payload.transcript) {
      updateData.transcript_text = payload.transcript;
    }

    // Add recording URL if provided
    if (payload.recording_url) {
      updateData.audio_path = payload.recording_url;
    }

    // Update the call record
    const { error: updateError } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', call.id);

    if (updateError) {
      console.error('[Webhook:CallKaro] Failed to update call:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update call record',
        },
        { status: 500 }
      );
    }

    console.log('[Webhook:CallKaro] Updated call:', {
      call_id: call.id,
      vendor_call_id: payload.call_id,
      status: payload.status,
      has_transcript: !!payload.transcript,
      has_recording: !!payload.recording_url,
    });

    return NextResponse.json({
      success: true,
      call_id: call.id,
      message: 'Call updated successfully',
    });
  } catch (error) {
    console.error('[Webhook:CallKaro] Error processing webhook:', error);

    // Return 200 to avoid webhook retries for application errors
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error),
    });
  }
}

// Optional: Implement signature verification for production
// function verifySignature(signature: string | null, secret: string): boolean {
//   if (!signature) return false;
//   // Implement HMAC verification based on CallKaro's specification
//   return true;
// }
