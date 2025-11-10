import {
  CallProvider,
  InitiateCallRequest,
  InitiateCallResponse,
  CallWebhookPayload,
} from '../call-provider';
import { createChildLogger, logApiRequest, logApiResponse, logError } from '../../logger';
import { captureException } from '../../sentry';

export class CallKaroProvider implements CallProvider {
  readonly name = 'CallKaro';
  readonly requiresAgentId = true;

  private baseUrl: string;
  private apiKey: string;
  private logger = createChildLogger({ provider: 'CallKaro' });

  constructor() {
    this.baseUrl = process.env.CALLKARO_BASE_URL || 'https://api.callkaro.ai';
    this.apiKey = process.env.CALLKARO_API_KEY || '';

    // SECURITY FIX: Throw error if API key is missing to fail fast
    if (!this.apiKey) {
      const error = new Error('CALLKARO_API_KEY not set in environment variables');
      this.logger.error('Missing required API key - provider cannot function');
      captureException(error, { tags: { provider: 'CallKaro', severity: 'critical' } });
      throw error;
    }

    this.logger.info({ baseUrl: this.baseUrl }, 'CallKaro provider initialized');
  }

  async initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse> {
    const requestPayload = {
      to_number: request.toNumber,
      agent_id: request.agentId,
      metadata: request.metadata,
    };

    logApiRequest(this.logger, 'POST', '/call/outbound', {
      toNumber: `***${request.toNumber.slice(-4)}`,
      agentId: request.agentId,
      callId: request.metadata?.call_id,
    });

    const apiStartTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/call/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify(requestPayload),
      });

      const apiDuration = Date.now() - apiStartTime;
      logApiResponse(this.logger, 'POST', '/call/outbound', response.status, apiDuration, {
        callId: request.metadata?.call_id,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError(this.logger, 'CallKaro API returned error status', new Error(errorText), {
          status: response.status,
          callId: request.metadata?.call_id,
          duration: apiDuration,
        });
        captureException(new Error(`CallKaro API ${response.status}: ${errorText}`), {
          tags: { provider: 'CallKaro', status: response.status },
          contexts: { request: { toNumber: `***${request.toNumber.slice(-4)}`, agentId: request.agentId } },
        });
        return {
          success: false,
          error: `CallKaro API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json() as any;

      this.logger.info({
        vendorCallId: data.call_id,
        callId: request.metadata?.call_id,
        status: data.status,
        duration: apiDuration,
      }, 'Call initiated successfully via CallKaro');

      return {
        success: true,
        vendorCallId: data.call_id,
        callId: request.metadata.call_id,
        status: data.status,
        message: data.message,
      };
    } catch (error) {
      const apiDuration = Date.now() - apiStartTime;
      logError(this.logger, 'Exception during CallKaro API call', error as Error, {
        callId: request.metadata?.call_id,
        duration: apiDuration,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      captureException(error, {
        tags: { provider: 'CallKaro', operation: 'initiate_call' },
        contexts: { request: { toNumber: `***${request.toNumber.slice(-4)}`, agentId: request.agentId } },
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  parseWebhook(rawPayload: any): CallWebhookPayload {
    this.logger.debug({
      vendorCallId: rawPayload.call_id,
      status: rawPayload.status,
      hasTranscript: !!rawPayload.transcript,
      hasRecording: !!rawPayload.recording_url,
    }, 'Parsing CallKaro webhook payload');

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
      this.logger.warn('CALLKARO_WEBHOOK_SECRET not set, skipping signature verification');
      return true; // Allow through for now
    }

    // Implement HMAC verification here when needed
    // For now, just return true
    this.logger.debug('Webhook signature verification not yet implemented');
    return true;
  }
}
