/**
 * Call Provider Interface
 *
 * This interface defines a standard contract for voice call providers,
 * allowing the application to swap between different services (CallKaro, Vapi, etc.)
 * without changing business logic.
 */

export interface CallMetadata {
  call_id: string;
  user_id: string;
  name?: string;
  [key: string]: any;
}

export interface InitiateCallRequest {
  toNumber: string;
  agentId: string;
  metadata: CallMetadata;
}

export interface InitiateCallResponse {
  success: boolean;
  callId?: string;          // Our internal call ID
  vendorCallId?: string;    // Provider's call ID
  status?: string;
  message?: string;
  error?: string;
}

export interface CallWebhookPayload {
  vendorCallId: string;
  status: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | 'busy';
  metadata?: CallMetadata;
  transcript?: string;
  recordingUrl?: string;
  duration?: number;
  timestamp: string;
}

export interface CallProvider {
  /**
   * Initiate an outbound voice call
   */
  initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse>;

  /**
   * Parse webhook payload from the provider to our standard format
   */
  parseWebhook(rawPayload: any): CallWebhookPayload;

  /**
   * Verify webhook signature (optional, provider-specific)
   */
  verifyWebhookSignature?(payload: string, signature: string): boolean;

  /**
   * Provider metadata
   */
  readonly name: string;
  readonly requiresAgentId: boolean;
}
