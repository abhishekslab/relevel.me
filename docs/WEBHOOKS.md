# Webhook System Documentation

## Overview

The webhook system enables **flexible integration** with external sources (YouTube, email, n8n, RSS feeds, etc.) by accepting JSON webhooks that are processed asynchronously by an **LLM-powered worker**. The LLM analyzes incoming data and intelligently decides what actions to take—creating memories, generating summaries, scheduling calls, or ignoring irrelevant content.

This creates a universal "inbox" for your second brain that can accept information from any source.

## Architecture

```
┌──────────────────┐
│ External Sources │
│  (YouTube, etc)  │
└────────┬─────────┘
         │ POST JSON
         ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js App (Port 3000)                 │
│                                                           │
│  POST /api/webhooks/ingest                               │
│    ├─ Validate payload                                   │
│    ├─ Store in webhook_events (status: pending)          │
│    ├─ Queue job in Redis                                 │
│    └─ Return 200 OK (immediate response)                 │
└────────┬────────────────────────────────────────────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌──────────────┐  ┌────────────────────────────────────┐
│   Redis      │  │   PostgreSQL (Supabase)            │
│ (Port 6379)  │  │                                    │
│              │  │   Tables:                          │
│ Bull Queues: │  │   - webhook_events (audit log)     │
│ - daily-calls│  │   - messages (created memories)    │
│ - webhooks   │  │                                    │
└──────┬───────┘  └────────────────────────────────────┘
       │                        ▲
       │                        │
       ▼                        │
┌──────────────────────────────┼────────────────────────┐
│          Worker Service      │                        │
│                              │                        │
│  process-webhook-event       │                        │
│    ├─ Fetch event from DB    │                        │
│    ├─ Update status: processing                       │
│    ├─ Send to LLM for analysis                        │
│    ├─ Parse LLM JSON response                         │
│    ├─ Execute actions ────────┘                       │
│    │   ├─ create_memory → messages table             │
│    │   ├─ chat_response → return summary             │
│    │   ├─ schedule_call → queue call job             │
│    │   └─ ignore → skip                               │
│    └─ Store result, update status: completed          │
└────────────────────────────────────────────────────────┘
```

## Components

### 1. API Route (`web/app/api/webhooks/ingest/route.ts`)

**Endpoint:** `POST /api/webhooks/ingest`

Accepts webhook payloads and queues them for async processing.

**Request Format:**
```json
{
  "user_id": "uuid",           // Optional: User to associate event with
  "source": "youtube",          // Required: Source identifier
  "event_type": "video_published", // Optional: Event classification
  ... any other fields          // Flexible: Stored in JSONB payload
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

**Features:**
- Service role client (bypasses RLS)
- Immediate 200 response (async processing)
- Structured logging with correlation IDs
- Sentry error tracking
- Returns 200 even on errors to prevent webhook retry storms

### 2. Database Schema

#### `webhook_events` Table

Stores all incoming webhook events with full audit trail.

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,              -- Source identifier
  event_type TEXT,                   -- Event classification
  payload JSONB NOT NULL,            -- Full webhook payload
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|completed|failed
  processing_result JSONB,           -- LLM analysis and action results
  error_message TEXT,                -- Error details if failed
  processed_at TIMESTAMPTZ,          -- When processing completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_user_status ON webhook_events(user_id, status);
```

**RLS Policies:**
- Users can view their own webhook events
- Service role can insert/update (for API route and worker)

#### Processing Result Structure

Stored in `processing_result` JSONB column:

```json
{
  "llm_analysis": "This email contains an important project deadline...",
  "actions": [
    {
      "type": "create_memory",
      "params": {
        "title": "Project deadline moved up",
        "content": "Q1 review now due next Friday instead of end of month",
        "tags": ["work", "deadline", "urgent"]
      },
      "executed": true,
      "result": {
        "memoryId": "uuid-here",
        "title": "Project deadline moved up",
        "tags": ["work", "deadline", "urgent"]
      }
    }
  ],
  "metadata": {
    "importance": "high",
    "processed_at": "2025-01-15T14:25:00Z"
  }
}
```

### 3. Queue System

#### Queue Configuration

Added to existing Bull queue system in `packages/shared/src/queue/`:

```typescript
export const QUEUE_NAMES = {
  DAILY_CALLS: 'daily-calls',
  WEBHOOK_EVENTS: 'webhook-events',  // New queue
} as const;

export const JOB_NAMES = {
  SCHEDULE_CALLS: 'schedule-calls',
  PROCESS_USER_CALL: 'process-user-call',
  PROCESS_WEBHOOK_EVENT: 'process-webhook-event',  // New job
} as const;
```

#### Job Data Interface

```typescript
export interface ProcessWebhookJobData {
  eventId: string;  // UUID of webhook_events row
}
```

**Job Options:**
- Attempts: 3 (with exponential backoff)
- Backoff delay: 2 seconds initial
- Keep completed: 100 jobs
- Keep failed: 500 jobs
- Concurrency: 5 (parallel processing)

### 4. Worker Processor (`worker/src/queue/jobs/process-webhook.ts`)

Processes webhook events asynchronously:

```typescript
export async function processWebhookEventJob(job: Job<ProcessWebhookJobData>) {
  const { eventId } = job.data;

  // 1. Fetch event from database
  // 2. Update status to 'processing'
  // 3. Send to LLM for analysis
  // 4. Parse LLM response (structured JSON)
  // 5. Execute actions (create memory, etc.)
  // 6. Store results
  // 7. Update status to 'completed'

  return { success: true, actionsExecuted: N };
}
```

### 5. LLM Processor Service (`packages/shared/src/services/webhook-processor.ts`)

Core service that analyzes webhooks with LLM and executes actions.

#### System Prompt

Instructs the LLM to:
1. Analyze webhook content for relevance and importance
2. Determine appropriate actions
3. Return structured JSON response

#### Available Actions

```typescript
export type WebhookActionType =
  | 'create_memory'        // Save as searchable memory with tags
  | 'chat_response'        // Generate summary/response
  | 'schedule_call'        // Trigger follow-up call
  | 'send_notification'    // Alert user (future)
  | 'ignore';              // Skip processing
```

#### LLM Response Format

```json
{
  "analysis": "Brief analysis of why this matters",
  "importance": "high|medium|low",
  "actions": [
    {
      "type": "create_memory",
      "params": {
        "title": "Memory title",
        "content": "Memory content",
        "tags": ["tag1", "tag2"]
      },
      "reason": "Why this action was chosen"
    }
  ]
}
```

#### Action Execution

**create_memory:**
- Inserts into `messages` table
- Sets source as `webhook:{source}`
- Includes tags and content
- Returns memoryId in result

**chat_response:**
- Stores generated message in result
- Can be retrieved from processing_result

**schedule_call:**
- Not yet implemented (placeholder)

**send_notification:**
- Not yet implemented (placeholder)

**ignore:**
- Marks event as completed with no action

## Usage Examples

### YouTube Video Notification

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "source": "youtube",
    "event_type": "video_published",
    "video_id": "dQw4w9WgXcQ",
    "title": "AI breakthrough in memory retention",
    "description": "New research on memory organization",
    "published_at": "2025-01-15T10:30:00Z"
  }'
```

**Expected LLM Behavior:**
- Analyze if video topic is relevant to user's interests
- Extract key information (title, topic)
- Create memory with tags like `["ai", "research", "youtube"]`

### Email Summary from n8n

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "source": "email",
    "event_type": "email_received",
    "from": "boss@company.com",
    "subject": "Project deadline moved up",
    "body": "The Q1 review is now due next Friday",
    "received_at": "2025-01-15T14:22:00Z"
  }'
```

**Expected LLM Behavior:**
- Recognize importance (work-related deadline)
- Create memory with tags `["work", "deadline", "urgent"]`
- Possibly schedule follow-up call if very important

### n8n Workflow Output

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "source": "n8n",
    "event_type": "workflow_completed",
    "workflow_name": "Daily Standup Summary",
    "data": {
      "summary": "5 tasks completed, 2 blockers",
      "tasks": ["Feature A", "Bug fix B"],
      "blockers": ["API rate limit"]
    }
  }'
```

**Expected LLM Behavior:**
- Summarize key accomplishments and blockers
- Create memory for future reference
- Tag appropriately for searchability

### RSS Feed Article

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "source": "rss",
    "event_type": "new_article",
    "title": "The Future of Personal Knowledge Management",
    "url": "https://blog.example.com/pkm-future",
    "summary": "Exploring AI in knowledge management",
    "tags": ["productivity", "AI", "pkm"]
  }'
```

**Expected LLM Behavior:**
- Determine if topic aligns with user interests
- Extract key insights from summary
- Create memory or ignore if not relevant

## Integration Guides

### n8n Integration

1. **Create HTTP Request Node**
   - Method: POST
   - URL: `https://your-domain.com/api/webhooks/ingest`
   - Authentication: None (or configure as needed)

2. **Configure Body**
   ```json
   {
     "user_id": "{{ $('Config').item.json.user_id }}",
     "source": "n8n",
     "event_type": "{{ $workflow.name }}",
     "workflow_name": "{{ $workflow.name }}",
     "data": "{{ $json }}"
   }
   ```

3. **Add Error Handling**
   - On Error node to retry
   - Log failures for debugging

### Zapier Integration

1. **Add "Webhooks by Zapier" Action**
2. **Choose "POST"**
3. **URL:** `https://your-domain.com/api/webhooks/ingest`
4. **Payload Type:** JSON
5. **Data:**
   ```json
   {
     "user_id": "your-user-id",
     "source": "zapier",
     "event_type": "{{trigger.type}}",
     "data": "{{trigger.data}}"
   }
   ```

### IFTTT Webhook

1. **Create New Applet**
2. **Choose Trigger** (e.g., "New email from")
3. **Choose "Webhooks" Action**
4. **Configure:**
   - URL: `https://your-domain.com/api/webhooks/ingest`
   - Method: POST
   - Content Type: application/json
   - Body:
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

### RSS Monitor (via Automation)

Set up automation tool to:
1. Poll RSS feed every N minutes
2. Detect new articles
3. POST to webhook with article details
4. LLM decides if worth saving

## Monitoring & Debugging

### Database Queries

**View Recent Webhooks:**
```sql
SELECT
  id,
  source,
  event_type,
  status,
  created_at,
  processed_at
FROM webhook_events
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;
```

**View Processing Results:**
```sql
SELECT
  id,
  source,
  payload->>'title' as title,
  processing_result->'llm_analysis' as analysis,
  processing_result->'actions' as actions,
  processing_result->'metadata'->>'importance' as importance,
  status
FROM webhook_events
WHERE user_id = 'your-user-id'
  AND status = 'completed'
ORDER BY created_at DESC;
```

**Check Failed Webhooks:**
```sql
SELECT
  id,
  source,
  payload,
  error_message,
  created_at
FROM webhook_events
WHERE user_id = 'your-user-id'
  AND status = 'failed';
```

**View Created Memories from Webhooks:**
```sql
SELECT
  id,
  content,
  tags,
  source,
  created_at
FROM messages
WHERE user_id = 'your-user-id'
  AND source LIKE 'webhook:%'
ORDER BY created_at DESC;
```

### Worker Logs

Start worker in development mode to see detailed logs:

```bash
cd worker
npm run dev
```

**Expected Log Output:**
```
[Worker] Starting queue worker...
[Worker] Queues: daily-calls, webhook-events
[Worker] Registered processor: process-webhook-event (concurrency: 5)
[Webhook Queue] Job 123 (process-webhook-event) started
{"service":"WebhookProcessor","eventId":"abc-123","msg":"Starting webhook event processing"}
{"service":"WebhookProcessor","eventId":"abc-123","importance":"medium","actionCount":1,"msg":"LLM analysis completed"}
{"service":"WebhookProcessor","eventId":"abc-123","actionType":"create_memory","success":true,"msg":"Action executed"}
[Webhook Queue] Job 123 completed: { success: true, actionsExecuted: 1 }
```

### API Testing

**Health Check:**
```bash
curl http://localhost:3000/api/webhooks/ingest
# Returns: {"status":"ok","endpoint":"/api/webhooks/ingest","methods":["POST"]}
```

**Test Webhook:**
```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{"user_id":"your-id","source":"test","content":"Hello"}'
# Returns: {"success":true,"event_id":"uuid","message":"..."}
```

## Configuration

### Environment Variables

No new environment variables required. Uses existing configuration:

**LLM Provider:**
```bash
LLM_PROVIDER=ollama  # or openrouter
OLLAMA_BASE_URL=http://localhost:11434  # if using Ollama
OPENROUTER_API_KEY=sk-xxx  # if using OpenRouter
```

**Queue/Database:**
```bash
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Queue Settings

Default concurrency: 5 (configurable via `QUEUE_CONCURRENCY` env var)

```bash
QUEUE_CONCURRENCY=10  # Process up to 10 webhooks in parallel
```

### LLM Settings

Temperature: 0.3 (for consistent structured output)
Max Tokens: 1000

To customize, edit `webhook-processor.ts`:
```typescript
const response = await llmProvider.chat({
  messages,
  temperature: 0.3,  // Lower = more consistent
  maxTokens: 1000,
});
```

## Security

### Current Implementation

⚠️ **No authentication** on webhook endpoint
- Suitable for personal use or trusted networks
- Use firewall/VPN to restrict access

### Future Enhancements

Planned security improvements:

**Bearer Token Authentication:**
```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Authorization: Bearer your-secret-token" \
  -d '...'
```

**HMAC Signature Verification:**
```bash
# Similar to payment webhook
X-Webhook-Signature: sha256=hash
```

**Per-Source Configuration:**
- Different auth methods per source
- API keys for specific integrations
- IP allowlisting

**Rate Limiting:**
- Limit webhooks per user/source
- Prevent abuse

## Troubleshooting

### Issue: Webhook Received but Not Processed

**Symptoms:**
- Event stored with status='pending'
- Never transitions to 'processing'

**Solutions:**
1. Check worker is running: `cd worker && npm run dev`
2. Verify Redis is running: `redis-cli ping`
3. Check worker logs for connection errors
4. Verify queue name matches in worker registration

### Issue: LLM Not Analyzing Content

**Symptoms:**
- Event status='failed'
- Error message mentions LLM

**Solutions:**
1. Verify LLM provider configured:
   - `echo $LLM_PROVIDER` (should be 'ollama' or 'openrouter')
   - Check API keys if using OpenRouter
   - Verify Ollama is running: `curl http://localhost:11434`
2. Check worker logs for LLM errors
3. Test LLM provider manually with chat API

### Issue: Memory Not Created

**Symptoms:**
- Event status='completed'
- No entry in messages table

**Solutions:**
1. Check processing_result: `SELECT processing_result FROM webhook_events WHERE id='xxx'`
2. Verify LLM decided to create memory (check actions array)
3. Check if user_id is valid: `SELECT id FROM auth.users WHERE id='xxx'`
4. Review LLM analysis to understand why it chose not to create memory

### Issue: Invalid JSON Response from LLM

**Symptoms:**
- Error: "LLM response is not valid JSON"

**Solutions:**
1. Review LLM response in logs
2. LLM might be returning markdown code blocks - adjust parsing
3. Lower temperature for more consistent output
4. Improve system prompt for clearer JSON formatting

## Performance Considerations

### Throughput

- **Webhook ingestion**: < 100ms (immediate response)
- **Queue latency**: < 1 second (Redis)
- **LLM processing**: 2-10 seconds (depends on provider)
- **Total end-to-end**: 3-15 seconds

### Scalability

Current design supports:
- **Volume**: 1000s of webhooks/day per user
- **Concurrency**: 5 parallel jobs (configurable)
- **Payload size**: Practical limit ~100KB (JSONB)
- **Retention**: Unlimited (configure cleanup if needed)

### Optimization Tips

**For High Volume:**
1. Increase concurrency: `QUEUE_CONCURRENCY=20`
2. Use faster LLM provider (OpenRouter vs Ollama)
3. Add webhook source-based filtering (skip low-priority sources)
4. Batch similar webhooks (future enhancement)

**For Large Payloads:**
1. Store large content in object storage
2. Pass reference URL instead of full content
3. Compress payload before storing

## Testing

### Automated Tests

Run included test script:

```bash
# Test locally
./test-webhook-examples.sh

# Test production
./test-webhook-examples.sh production
```

### Manual Testing

**Step 1: Find your user ID**
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

**Step 2: Send test webhook**
```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id-here",
    "source": "manual",
    "content": "Test webhook - remember this important note!"
  }'
```

**Step 3: Check processing**
```bash
# Watch worker logs
cd worker && npm run dev

# Query database
psql $DATABASE_URL -c "SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 1;"
```

**Step 4: Verify memory created**
```sql
SELECT * FROM messages
WHERE source LIKE 'webhook:%'
ORDER BY created_at DESC
LIMIT 1;
```

## Advanced Customization

### Custom System Prompt

Edit `packages/shared/src/services/webhook-processor.ts`:

```typescript
function getWebhookSystemPrompt(): string {
  return `Your custom prompt here...

  Focus on topics: ${userPreferences.interests.join(', ')}

  Always create memories for: emails from boss, calendar events

  Never save: spam, promotional content

  Respond in JSON format: ...`;
}
```

### Custom Action Types

**1. Define new action type:**

`packages/shared/src/types/webhook.ts`:
```typescript
export type WebhookActionType =
  | 'create_memory'
  | 'send_email'      // New action
  | 'ignore';
```

**2. Implement action handler:**

`packages/shared/src/services/webhook-processor.ts`:
```typescript
async function executeAction(...) {
  switch (type) {
    case 'send_email':
      return await sendEmailAction(supabase, event, params);
    // ...
  }
}

async function sendEmailAction(supabase, event, params) {
  const { to, subject, body } = params;
  // Implement email sending logic
  await sendEmail({ to, subject, body });
  return {
    type: 'send_email',
    params,
    executed: true,
    result: { sent: true }
  };
}
```

**3. Update LLM prompt to include new action**

### Per-Source Rules

Implement custom logic based on source:

```typescript
export async function processWebhookEvent(params) {
  const { supabase, eventId } = params;

  const event = await fetchEvent(eventId);

  // Custom rules per source
  if (event.source === 'youtube') {
    // Only process videos from specific channels
    const allowedChannels = await getUserPreference('youtube_channels');
    if (!allowedChannels.includes(event.payload.channel_id)) {
      return skipProcessing(eventId, 'Channel not in allowlist');
    }
  }

  if (event.source === 'email') {
    // Auto-save emails from VIPs
    const vipSenders = await getUserPreference('vip_emails');
    if (vipSenders.includes(event.payload.from)) {
      return autoCreateMemory(event, 'VIP email');
    }
  }

  // Default: Process with LLM
  return analyzeWithLLM(event);
}
```

## Future Enhancements

- [ ] Dashboard UI to view/manage webhook events
- [ ] Webhook authentication (bearer token, HMAC signatures)
- [ ] Per-source configuration (enable/disable, custom rules)
- [ ] Webhook analytics (events per source, success rate)
- [ ] Real-time webhook event streaming to dashboard
- [ ] Template-based memory creation (skip LLM for known patterns)
- [ ] Batch webhook processing for efficiency
- [ ] Webhook transformation rules (pre-LLM normalization)
- [ ] User-configurable LLM prompts per source
- [ ] Webhook replay/retry from dashboard
- [ ] Source-specific schemas with validation
- [ ] Webhook delivery status callbacks
- [ ] Memory deduplication (prevent duplicate saves)
- [ ] Smart tagging based on user's memory graph
- [ ] Context-aware processing (reference past memories)

## Related Documentation

- [Queue System](./QUEUE_SYSTEM.md) - Background job processing
- [Architecture](./ARCHITECTURE.md) - Overall system design
- [Providers](./PROVIDERS.md) - LLM and call provider configuration
- [Logging](./LOGGING.md) - Structured logging setup
