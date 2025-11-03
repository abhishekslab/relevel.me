import {
  CallProvider,
  InitiateCallRequest,
  InitiateCallResponse,
  CallWebhookPayload,
} from '../call-provider';

/**
 * Vapi Provider Implementation
 *
 * This is a stub implementation for Vapi (https://vapi.ai) as an alternative
 * to CallKaro. Configure with VAPI_API_KEY and VAPI_ASSISTANT_ID.
 *
 * API Documentation: https://docs.vapi.ai
 */
export class VapiProvider implements CallProvider {
  readonly name = 'Vapi';
  readonly requiresAgentId = false; // Vapi uses assistant IDs directly

  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';
    this.apiKey = process.env.VAPI_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[VapiProvider] VAPI_API_KEY not set in environment variables');
    }
  }

  async initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse> {
    try {
      // Vapi API call structure
      // Reference: https://docs.vapi.ai/api-reference/calls/create-phone-call
      const response = await fetch(`${this.baseUrl}/call/phone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumberId: request.toNumber, // Vapi uses phoneNumberId
          assistantId: request.agentId || process.env.VAPI_ASSISTANT_ID,
          metadata: request.metadata,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VapiProvider] API error:', response.status, errorText);
        return {
          success: false,
          error: `Vapi API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json() as any;

      return {
        success: true,
        vendorCallId: data.id, // Vapi returns 'id' for call
        callId: request.metadata.call_id,
        status: data.status,
        message: 'Call initiated successfully',
      };
    } catch (error) {
      console.error('[VapiProvider] Exception during initiateCall:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  parseWebhook(rawPayload: any): CallWebhookPayload {
    // Vapi webhook payload structure
    // Reference: https://docs.vapi.ai/webhooks

    // Map Vapi status to our standard status
    const statusMap: Record<string, CallWebhookPayload['status']> = {
      'queued': 'ringing',
      'ringing': 'ringing',
      'in-progress': 'in_progress',
      'forwarding': 'in_progress',
      'ended': 'completed',
      'failed': 'failed',
      'busy': 'busy',
      'no-answer': 'no_answer',
    };

    return {
      vendorCallId: rawPayload.call?.id || rawPayload.id,
      status: statusMap[rawPayload.status] || 'failed',
      metadata: rawPayload.metadata,
      transcript: rawPayload.transcript?.text || rawPayload.messages?.map((m: any) => m.content).join('\n'),
      recordingUrl: rawPayload.recordingUrl,
      duration: rawPayload.endedAt && rawPayload.startedAt
        ? (new Date(rawPayload.endedAt).getTime() - new Date(rawPayload.startedAt).getTime()) / 1000
        : undefined,
      timestamp: rawPayload.createdAt || new Date().toISOString(),
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Vapi uses webhook secrets for verification
    // TODO: Implement HMAC verification based on Vapi's spec
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[VapiProvider] VAPI_WEBHOOK_SECRET not set, skipping signature verification');
      return true;
    }

    // Implement verification here based on Vapi docs
    return true;
  }
}
