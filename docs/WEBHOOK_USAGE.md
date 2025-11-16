# Webhook System Usage Guide

The webhook system allows you to send information from various sources (YouTube, email, n8n, etc.) to your relevel.me second brain, where an LLM will process it and decide what to do with it.

## Quick Start

### 1. Get Your User ID

Find your user ID in Supabase:
```sql
SELECT id FROM auth.users WHERE email = 'your-email@example.com';
```

### 2. Send a Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id-here",
    "source": "manual",
    "content": "Remember: Schedule dentist appointment next Tuesday"
  }'
```

### 3. Check Processing

The webhook is processed asynchronously. Check:
- Worker logs for LLM processing details
- `webhook_events` table for event status
- `messages` table for created memories

## How It Works

```mermaid
graph LR
    A[Webhook Source] -->|POST| B[/api/webhooks/ingest]
    B -->|Store| C[(webhook_events table)]
    B -->|Queue| D[Bull Queue]
    D -->|Process| E[Worker]
    E -->|Analyze| F[LLM]
    F -->|Actions| G{Action Type}
    G -->|create_memory| H[(messages table)]
    G -->|chat_response| I[Response]
    G -->|schedule_call| J[Call Queue]
    G -->|ignore| K[Skip]
```

## Webhook Payload Format

### Required Fields

```json
{
  "source": "youtube|email|n8n|rss|slack|manual"
}
```

### Optional Fields

```json
{
  "user_id": "uuid",          // User to associate this webhook with
  "event_type": "string",     // Type of event (free-form)
  ... any other fields        // Stored in payload JSONB column
}
```

## Example Payloads

### YouTube Video Notification

```json
{
  "user_id": "abc-123",
  "source": "youtube",
  "event_type": "video_published",
  "video_id": "dQw4w9WgXcQ",
  "title": "Amazing productivity tip",
  "description": "Learn how to boost your memory",
  "published_at": "2025-01-15T10:30:00Z"
}
```

### Email Summary

```json
{
  "user_id": "abc-123",
  "source": "email",
  "event_type": "email_received",
  "from": "boss@company.com",
  "subject": "Project deadline moved up",
  "body": "The Q1 review is now due next Friday instead of end of month",
  "received_at": "2025-01-15T14:22:00Z"
}
```

### n8n Workflow Output

```json
{
  "user_id": "abc-123",
  "source": "n8n",
  "event_type": "workflow_completed",
  "workflow_name": "Daily Standup Summary",
  "data": {
    "summary": "Completed 5 tasks, 2 blockers",
    "tasks": ["Feature A", "Bug fix B"],
    "blockers": ["API rate limit"]
  }
}
```

### RSS Feed Article

```json
{
  "user_id": "abc-123",
  "source": "rss",
  "event_type": "new_article",
  "title": "The Future of PKM",
  "url": "https://blog.example.com/pkm-future",
  "summary": "AI is transforming knowledge management",
  "tags": ["productivity", "AI"]
}
```

## LLM Processing

The LLM analyzes each webhook and decides what to do with it. It can:

### 1. Create Memory
Extracts important information and saves it as a memory with tags.

**Example**: Email about project deadline → Creates memory with tags `["work", "deadline", "project"]`

### 2. Generate Response
Creates a summary or response to the content.

**Example**: Long article → Generates key takeaways

### 3. Schedule Call
Triggers a follow-up call to discuss the topic.

**Example**: Important decision needed → Schedules evening call

### 4. Send Notification
Sends a notification to the user (future feature).

### 5. Ignore
Skips processing if content is not relevant.

**Example**: Spam or low-value notification

## Integration Examples

### n8n Workflow

1. Create HTTP Request node
2. Set Method: POST
3. Set URL: `https://your-domain.com/api/webhooks/ingest`
4. Set Body:
```json
{
  "user_id": "{{ $('User ID').item.json.user_id }}",
  "source": "n8n",
  "event_type": "workflow_completed",
  "workflow_name": "{{ $workflow.name }}",
  "data": "{{ $json }}"
}
```

### Zapier Integration

1. Add "Webhooks by Zapier" action
2. Choose "POST"
3. URL: `https://your-domain.com/api/webhooks/ingest`
4. Data (JSON):
```json
{
  "user_id": "your-user-id",
  "source": "zapier",
  "event_type": "{{trigger.type}}",
  "data": "{{trigger.data}}"
}
```

### IFTTT Webhook

1. Create new applet
2. Choose trigger (e.g., "New email from")
3. Choose "Webhooks" action
4. URL: `https://your-domain.com/api/webhooks/ingest`
5. Method: POST
6. Content Type: application/json
7. Body:
```json
{
  "user_id": "your-user-id",
  "source": "ifttt",
  "event_type": "email",
  "from": "{{FromAddress}}",
  "subject": "{{Subject}}",
  "body": "{{BodyPlain}}"
}
```

### RSS to Webhook (via n8n/Zapier)

Monitor RSS feeds and send new articles to webhook for LLM to analyze and decide if worth saving.

## Database Schema

### webhook_events Table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  processing_result JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Processing Result Structure

```json
{
  "llm_analysis": "This email discusses an important project deadline change...",
  "actions": [
    {
      "type": "create_memory",
      "params": {
        "title": "Project deadline moved up",
        "content": "Q1 review now due next Friday",
        "tags": ["work", "deadline", "urgent"]
      },
      "executed": true,
      "result": {
        "memoryId": "memory-uuid-here"
      }
    }
  ],
  "metadata": {
    "importance": "high",
    "processed_at": "2025-01-15T14:25:00Z"
  }
}
```

## Monitoring

### Check Webhook Status

```sql
-- View recent webhooks
SELECT id, source, event_type, status, created_at, processed_at
FROM webhook_events
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;

-- View processing results
SELECT
  id,
  source,
  payload->>'title' as title,
  processing_result->'llm_analysis' as analysis,
  processing_result->'actions' as actions,
  status
FROM webhook_events
WHERE user_id = 'your-user-id'
  AND status = 'completed'
ORDER BY created_at DESC;

-- Check failed webhooks
SELECT id, source, payload, error_message
FROM webhook_events
WHERE user_id = 'your-user-id'
  AND status = 'failed';
```

### Worker Logs

```bash
# View worker processing logs
cd worker
npm run dev

# Look for:
# [Webhook Queue] Job xxx (process-webhook-event) started
# [LLM analysis completed] importance: high, actionCount: 1
# [Action executed] actionType: create_memory, success: true
```

## Testing

Run the included test script to send sample webhooks:

```bash
# Test locally
./test-webhook-examples.sh

# Test production
./test-webhook-examples.sh production
```

## Security Considerations

### Current Setup (No Auth)
- Webhook is currently open (no authentication)
- Suitable for personal use or trusted networks
- Use firewall rules to restrict access if needed

### Future Enhancements
- Bearer token authentication
- HMAC signature verification per source
- Rate limiting per user/source
- Webhook retry logic for failed deliveries

## Troubleshooting

### Webhook Received but Not Processed

1. Check worker is running: `cd worker && npm run dev`
2. Check Redis is running: `redis-cli ping`
3. Check worker logs for errors
4. Query webhook_events table for error_message

### Memory Not Created

1. Check LLM decided to create memory: `processing_result->'actions'`
2. Check user_id is valid
3. Check LLM provider is configured (OLLAMA or OPENROUTER)
4. Check worker logs for LLM errors

### Invalid JSON Error

- Ensure Content-Type header is `application/json`
- Validate JSON syntax with a JSON validator
- Check for special characters that need escaping

## Advanced Configuration

### Custom LLM Prompt

Edit `packages/shared/src/services/webhook-processor.ts`:

```typescript
function getWebhookSystemPrompt(): string {
  return `Your custom prompt here...`;
}
```

### Custom Actions

Add new action types in `packages/shared/src/types/webhook.ts`:

```typescript
export type WebhookActionType =
  | 'create_memory'
  | 'chat_response'
  | 'schedule_call'
  | 'send_notification'
  | 'your_custom_action' // Add here
  | 'ignore';
```

Then implement in `webhook-processor.ts`:

```typescript
case 'your_custom_action':
  return await yourCustomActionHandler(supabase, event, params);
```

## API Reference

### POST /api/webhooks/ingest

**Request:**
```
POST /api/webhooks/ingest
Content-Type: application/json

{
  "source": "string",
  "user_id": "uuid",
  ... any other fields
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "uuid",
  "message": "Webhook received and queued for processing"
}
```

### GET /api/webhooks/ingest

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "endpoint": "/api/webhooks/ingest",
  "methods": ["POST"]
}
```

## Future Enhancements

- [ ] Webhook authentication (bearer token, HMAC)
- [ ] Dashboard UI to view webhook events
- [ ] Retry failed webhooks from UI
- [ ] Webhook source management (enable/disable sources)
- [ ] Custom rules per source (always save, always ignore, etc.)
- [ ] Webhook analytics (events per source, success rate)
- [ ] Real-time webhook event streaming to dashboard
- [ ] Template-based memory creation (per source)
- [ ] Batch webhook processing
- [ ] Webhook transformation rules (before LLM processing)

## Support

For issues or questions:
1. Check worker logs
2. Query webhook_events table
3. Review LLM provider configuration
4. Check GitHub issues: https://github.com/your-repo/issues
