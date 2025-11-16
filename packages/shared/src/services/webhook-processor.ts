/**
 * Webhook processor service - handles LLM processing of webhook events
 * Analyzes incoming webhook data and determines what actions to take
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getLLMProvider } from '../providers/llm-factory';
import { ChatMessage } from '../providers/llm-provider';
import { createChildLogger } from '../logger';
import { captureException } from '../sentry';
import type {
  WebhookEvent,
  WebhookProcessingResult,
  LLMWebhookResponse,
  WebhookAction,
  WebhookActionType,
} from '../types/webhook';

const logger = createChildLogger({ service: 'WebhookProcessor' });

export interface ProcessWebhookEventParams {
  supabase: SupabaseClient; // Service role client for database operations
  eventId: string;
}

export interface ProcessWebhookEventResult {
  success: boolean;
  processingResult?: WebhookProcessingResult;
  error?: string;
}

/**
 * Get the system prompt for webhook processing
 * Instructs the LLM on how to analyze and respond to webhook events
 */
function getWebhookSystemPrompt(): string {
  return `You are an intelligent webhook processor for a voice-first second brain application. Your job is to analyze incoming webhook events and determine what actions to take.

You will receive webhook data from various sources like YouTube notifications, emails, n8n workflows, and other integrations.

Your responsibilities:
1. Analyze the content and determine its relevance and importance (high/medium/low)
2. Decide what actions to take based on the content
3. Extract key information that should be remembered

Available actions:
- create_memory: Extract and save important information as a memory (with tags, title, content)
- chat_response: Generate a response or summary of the content
- schedule_call: Schedule a follow-up call to discuss this topic
- send_notification: Send a notification to the user
- ignore: Skip processing if content is not relevant

You must respond with valid JSON in this exact format:
{
  "analysis": "Brief analysis of the webhook content and why it matters",
  "importance": "high|medium|low",
  "actions": [
    {
      "type": "create_memory|chat_response|schedule_call|send_notification|ignore",
      "params": {
        // For create_memory: { "title": "...", "content": "...", "tags": ["tag1", "tag2"] }
        // For chat_response: { "message": "..." }
        // For schedule_call: { "topic": "...", "reason": "..." }
        // For send_notification: { "title": "...", "message": "..." }
        // For ignore: {}
      },
      "reason": "Why you chose this action"
    }
  ]
}

Guidelines:
- Be selective: Only create memories for truly important or useful information
- Be concise: Extract the essence, not everything
- Be smart: Connect to user's goals and interests when possible
- Multiple actions: You can suggest multiple actions if appropriate
- Context matters: Consider the source when evaluating importance`;
}

/**
 * Main webhook processing function
 * Fetches event, processes with LLM, executes actions, and updates result
 */
export async function processWebhookEvent(
  params: ProcessWebhookEventParams
): Promise<ProcessWebhookEventResult> {
  const { supabase, eventId } = params;

  try {
    logger.info({ eventId }, 'Starting webhook event processing');

    // 1. Fetch the webhook event
    const { data: event, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      logger.error({ eventId, error: fetchError }, 'Failed to fetch webhook event');
      return { success: false, error: 'Event not found' };
    }

    // 2. Update status to processing
    await supabase
      .from('webhook_events')
      .update({ status: 'processing' })
      .eq('id', eventId);

    // 3. Process with LLM
    const llmResponse = await analyzeWebhookWithLLM(event);

    if (!llmResponse) {
      throw new Error('LLM analysis failed');
    }

    logger.info(
      { eventId, importance: llmResponse.importance, actionCount: llmResponse.actions.length },
      'LLM analysis completed'
    );

    // 4. Execute actions
    const executedActions: WebhookAction[] = [];

    for (const action of llmResponse.actions) {
      try {
        const executedAction = await executeAction(supabase, event, action);
        executedActions.push(executedAction);
        logger.info(
          { eventId, actionType: action.type, success: executedAction.executed },
          'Action executed'
        );
      } catch (actionError) {
        logger.error({ eventId, actionType: action.type, error: actionError }, 'Action failed');
        executedActions.push({
          type: action.type,
          params: action.params,
          executed: false,
          error: (actionError as Error).message,
        });
      }
    }

    // 5. Store processing result
    const processingResult: WebhookProcessingResult = {
      llm_analysis: llmResponse.analysis,
      actions: executedActions,
      metadata: {
        importance: llmResponse.importance,
        processed_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from('webhook_events')
      .update({
        status: 'completed',
        processing_result: processingResult,
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      logger.error({ eventId, error: updateError }, 'Failed to update webhook event');
    }

    logger.info({ eventId }, 'Webhook event processing completed');

    return { success: true, processingResult };
  } catch (error) {
    logger.error({ eventId, error }, 'Webhook processing failed');
    captureException(error as Error, {
      tags: { component: 'webhook-processor', eventId },
    });

    // Update status to failed
    await supabase
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: (error as Error).message,
      })
      .eq('id', eventId);

    return { success: false, error: (error as Error).message };
  }
}

/**
 * Analyze webhook event with LLM
 * Sends webhook payload to LLM and parses structured response
 */
async function analyzeWebhookWithLLM(event: WebhookEvent): Promise<LLMWebhookResponse | null> {
  try {
    const llmProvider = getLLMProvider();

    // Build context message with webhook data
    const contextMessage = `Webhook Event:
Source: ${event.source}
Type: ${event.event_type || 'unspecified'}
Payload:
${JSON.stringify(event.payload, null, 2)}

Analyze this webhook and respond with a JSON object describing what actions to take.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: getWebhookSystemPrompt() },
      { role: 'user', content: contextMessage },
    ];

    const response = await llmProvider.chat({
      messages,
      temperature: 0.3, // Lower temperature for more consistent structured output
      maxTokens: 1000,
    });

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error({ response: response.content }, 'LLM response is not valid JSON');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as LLMWebhookResponse;

    // Validate response structure
    if (!parsed.analysis || !parsed.importance || !Array.isArray(parsed.actions)) {
      logger.error({ parsed }, 'LLM response missing required fields');
      return null;
    }

    return parsed;
  } catch (error) {
    logger.error({ error, eventId: event.id }, 'LLM analysis failed');
    captureException(error as Error, {
      tags: { component: 'webhook-llm-analysis', eventId: event.id },
    });
    return null;
  }
}

/**
 * Execute a webhook action based on LLM decision
 */
async function executeAction(
  supabase: SupabaseClient,
  event: WebhookEvent,
  action: LLMWebhookResponse['actions'][0]
): Promise<WebhookAction> {
  const { type, params } = action;

  switch (type) {
    case 'create_memory':
      return await createMemoryAction(supabase, event, params);

    case 'chat_response':
      return {
        type: 'chat_response',
        params,
        executed: true,
        result: { message: params.message },
      };

    case 'schedule_call':
      return {
        type: 'schedule_call',
        params,
        executed: false,
        result: { message: 'Call scheduling not yet implemented' },
      };

    case 'send_notification':
      return {
        type: 'send_notification',
        params,
        executed: false,
        result: { message: 'Notifications not yet implemented' },
      };

    case 'ignore':
      return {
        type: 'ignore',
        params: {},
        executed: true,
        result: { message: 'Event ignored as requested' },
      };

    default:
      logger.warn({ actionType: type }, 'Unknown action type');
      return {
        type: type as WebhookActionType,
        params,
        executed: false,
        error: `Unknown action type: ${type}`,
      };
  }
}

/**
 * Create a memory from webhook data
 */
async function createMemoryAction(
  supabase: SupabaseClient,
  event: WebhookEvent,
  params: Record<string, any>
): Promise<WebhookAction> {
  try {
    const { title, content, tags } = params;

    if (!event.user_id) {
      throw new Error('Cannot create memory without user_id');
    }

    if (!content) {
      throw new Error('Memory content is required');
    }

    // Create memory in messages table
    const { data: memory, error: insertError } = await supabase
      .from('messages')
      .insert({
        user_id: event.user_id,
        content,
        tags: tags || [],
        source: `webhook:${event.source}`,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    logger.info({ memoryId: memory.id, eventId: event.id }, 'Memory created from webhook');

    return {
      type: 'create_memory',
      params,
      executed: true,
      result: { memoryId: memory.id, title, tags },
    };
  } catch (error) {
    logger.error({ eventId: event.id, error }, 'Failed to create memory');
    throw error;
  }
}
