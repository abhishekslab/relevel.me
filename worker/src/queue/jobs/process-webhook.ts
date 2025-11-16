/**
 * Webhook event job processor
 * Handles async processing of webhook events with LLM analysis
 */

import { Job } from 'bull';
import {
  ProcessWebhookJobData,
  processWebhookEvent,
  createChildLogger,
  logSuccess,
  logError,
  getSupabaseServiceClient,
} from '@relevel-me/shared';
import { captureException } from '@relevel-me/shared';

const logger = createChildLogger({ service: 'WebhookEventJob' });

/**
 * Process webhook event job
 * Fetches the event, analyzes with LLM, executes actions, and updates result
 */
export async function processWebhookEventJob(job: Job<ProcessWebhookJobData>) {
  const { eventId } = job.data;

  logger.info({ jobId: job.id, eventId }, 'Processing webhook event job');

  try {
    // Get service client for database operations
    const supabase = getSupabaseServiceClient();

    // Process the webhook event
    const result = await processWebhookEvent({
      supabase,
      eventId,
    });

    if (!result.success) {
      throw new Error(result.error || 'Webhook processing failed');
    }

    logSuccess(logger, 'Webhook event processing completed', {
      jobId: job.id,
      eventId,
      actionsExecuted: result.processingResult?.actions.length || 0,
    });

    return {
      success: true,
      eventId,
      actionsExecuted: result.processingResult?.actions.length || 0,
      processingResult: result.processingResult,
    };
  } catch (error) {
    logError(logger, 'Webhook event processing failed', error as Error, {
      jobId: job.id,
      eventId,
    });

    captureException(error as Error, {
      tags: { component: 'webhook-event-job', eventId },
      extra: { jobId: job.id },
    });

    throw error; // Re-throw to mark job as failed and trigger retry
  }
}
