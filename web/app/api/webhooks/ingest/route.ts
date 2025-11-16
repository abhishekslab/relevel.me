import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createRequestLogger,
  logDatabaseError,
  logSuccess,
  logError,
  getQueue,
  QUEUE_NAMES,
} from '@relevel-me/shared';
import type {
  WebhookIngestRequest,
  WebhookIngestResponse,
  ProcessWebhookJobData,
} from '@relevel-me/shared/types/webhook';
import { captureException, addBreadcrumb } from '@sentry/nextjs';

/**
 * Flexible Webhook Ingestion Handler
 * POST /api/webhooks/ingest
 *
 * Accepts any JSON payload from various sources (YouTube, email, n8n, etc.)
 * Stores in webhook_events table and queues for async LLM processing
 *
 * Expected payload (flexible):
 * {
 *   "user_id": "uuid",  // optional, can be extracted from other fields
 *   "source": "youtube|email|n8n|manual",  // required
 *   "event_type": "video_published|email_received|workflow_completed",  // optional
 *   ... any other fields stored in payload jsonb
 * }
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

    logger.info({ source: rawPayload.source }, 'Webhook received');
    addBreadcrumb({
      category: 'webhook',
      message: 'Webhook ingestion started',
      level: 'info',
      data: { source: rawPayload.source },
    });

    // Validate required fields
    if (!rawPayload.source) {
      logger.warn('Missing source field in webhook payload');
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: source',
        },
        { status: 400 }
      );
    }

    // Extract webhook fields
    const { user_id, source, event_type, ...rest } = rawPayload as WebhookIngestRequest;

    // Store entire payload in jsonb
    const payload = { user_id, source, event_type, ...rest };

    const supabase = getServiceClient();

    // Insert webhook event
    const { data: event, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        user_id: user_id || null,
        source,
        event_type: event_type || null,
        payload,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      logDatabaseError(logger, 'Failed to insert webhook event', insertError);
      captureException(insertError, {
        tags: { component: 'webhook-ingest' },
        extra: { source, event_type },
      });

      // Return 200 to prevent webhook retry storms for non-retryable errors
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to store webhook event',
        },
        { status: 200 }
      );
    }

    logger.info({ eventId: event.id }, 'Webhook event stored');

    // Queue for async processing
    try {
      const webhookQueue = getQueue(QUEUE_NAMES.WEBHOOK_EVENTS);
      const jobData: ProcessWebhookJobData = { eventId: event.id };

      await webhookQueue.add('process-webhook-event', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false, // Keep for debugging
        removeOnFail: false,
      });

      logger.info({ eventId: event.id }, 'Webhook processing job queued');
    } catch (queueError) {
      logError(logger, 'Failed to queue webhook processing job', queueError as Error);
      captureException(queueError, {
        tags: { component: 'webhook-queue' },
        extra: { eventId: event.id },
      });

      // Event is stored, job queue failed - mark for manual retry
      await supabase
        .from('webhook_events')
        .update({ error_message: 'Failed to queue processing job' })
        .eq('id', event.id);
    }

    const duration = Date.now() - startTime;
    logSuccess(logger, 'Webhook ingestion completed', { duration, eventId: event.id });

    const response: WebhookIngestResponse = {
      success: true,
      event_id: event.id,
      message: 'Webhook received and queued for processing',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(logger, 'Webhook ingestion failed', error as Error, { duration });
    captureException(error, {
      tags: { component: 'webhook-ingest' },
    });

    // Return 200 to prevent retry storms
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 200 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/ingest',
    methods: ['POST'],
  });
}
