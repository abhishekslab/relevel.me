import {
  CallProvider,
  InitiateCallRequest,
  InitiateCallResponse,
  CallWebhookPayload,
} from '../call-provider';

export class CallKaroProvider implements CallProvider {
  readonly name = 'CallKaro';
  readonly requiresAgentId = true;

  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.CALLKARO_BASE_URL || 'https://api.callkaro.ai';
    this.apiKey = process.env.CALLKARO_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[CallKaroProvider] CALLKARO_API_KEY not set in environment variables');
    }
  }

  async initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/call/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          to_number: request.toNumber,
          agent_id: request.agentId,
          metadata: request.metadata,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CallKaroProvider] API error:', response.status, errorText);
        return {
          success: false,
          error: `CallKaro API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json() as any;

      return {
        success: true,
        vendorCallId: data.call_id,
        callId: request.metadata.call_id,
        status: data.status,
        message: data.message,
      };
    } catch (error) {
      console.error('[CallKaroProvider] Exception during initiateCall:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  parseWebhook(rawPayload: any): CallWebhookPayload {
    return {
      vendorCallId: rawPayload.call_id,
      status: rawPayload.status,
      metadata: rawPayload.metadata,
      transcript: rawPayload.transcript,
      recordingUrl: rawPayload.recording_url,
      duration: rawPayload.duration,
      timestamp: rawPayload.timestamp,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // CallKaro webhook signature verification
    // TODO: Implement when webhook secret is available
    const webhookSecret = process.env.CALLKARO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[CallKaroProvider] CALLKARO_WEBHOOK_SECRET not set, skipping signature verification');
      return true; // Allow through for now
    }

    // Implement HMAC verification here when needed
    // For now, just return true
    return true;
  }
}
