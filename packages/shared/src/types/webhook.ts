/**
 * Webhook event types and interfaces
 */

export type WebhookEventStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type WebhookActionType =
  | 'create_memory'
  | 'chat_response'
  | 'schedule_call'
  | 'send_notification'
  | 'ignore';

export interface WebhookEvent {
  id: string;
  user_id: string | null;
  source: string;
  event_type: string | null;
  payload: Record<string, any>;
  status: WebhookEventStatus;
  processing_result: WebhookProcessingResult | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookIngestRequest {
  user_id?: string;
  source: string;
  event_type?: string;
  [key: string]: any; // Allow arbitrary fields in payload
}

export interface WebhookIngestResponse {
  success: boolean;
  event_id: string;
  message: string;
}

export interface WebhookAction {
  type: WebhookActionType;
  params: Record<string, any>;
  executed?: boolean;
  result?: any;
  error?: string;
}

export interface WebhookProcessingResult {
  llm_analysis?: string;
  actions: WebhookAction[];
  metadata?: Record<string, any>;
}

export interface ProcessWebhookJobData {
  eventId: string;
}

// LLM response schema for webhook processing
export interface LLMWebhookResponse {
  analysis: string;
  importance: 'high' | 'medium' | 'low';
  actions: Array<{
    type: WebhookActionType;
    params: Record<string, any>;
    reason?: string;
  }>;
}

// Common webhook source schemas (examples)
export interface YouTubeNotificationPayload {
  video_id: string;
  channel_id: string;
  title: string;
  published_at: string;
  description?: string;
}

export interface EmailWebhookPayload {
  from: string;
  subject: string;
  body: string;
  received_at: string;
  attachments?: Array<{
    filename: string;
    url: string;
  }>;
}

export interface N8NWorkflowPayload {
  workflow_id: string;
  workflow_name: string;
  execution_id: string;
  data: Record<string, any>;
  timestamp: string;
}
