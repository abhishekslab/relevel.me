# Queue System Documentation

## Overview

The queue system enables automated daily calls to users using **Redis** and **Bull** queue. It runs as a separate worker process that schedules and processes calls based on user preferences (timezone and preferred call time).

## Architecture

The queue system is now a **standalone worker service** with its own Docker container:

```
┌─────────────────┐       ┌──────────────────┐
│   Next.js App   │       │  Worker Service  │
│  (Port 3000)    │       │   (Standalone)   │
└────────┬────────┘       └────────┬─────────┘
         │                         │
         ├─── API Routes           ├─── Job Processors
         │    (/api/queue/*)       │    (Bull Consumer)
         │                         │
         │    ┌──────────────┐     │
         └────│    Redis     │─────┘
              │  (Port 6379) │
              └──────────────┘
                     │
             ┌───────┴────────┐
             │  CallKaro API  │
             └────────────────┘
```

## Components

### Worker Service (`worker/`)

A standalone Node.js service with its own dependencies and Docker container.

**Directory Structure:**
```
worker/
├── src/
│   ├── index.ts                    # Entry point
│   ├── queue/
│   │   ├── client.ts              # Bull queue client
│   │   ├── worker.ts              # Job processors
│   │   └── jobs/
│   │       └── daily-calls.ts     # Call job handlers
├── Dockerfile                      # Worker container
└── package.json                    # Worker dependencies

packages/shared/
└── src/
    ├── queue/
    │   ├── client.ts              # Shared Bull queue client
    │   └── types.ts               # Shared TypeScript types
    └── services/
        └── call-service.ts        # Shared call initiation logic
```

**Note:** Types and services are centralized in `packages/shared` to ensure consistency between web and worker packages.

### 1. **Queue Client** (`worker/src/queue/client.ts`)
- Initializes Redis connection
- Creates Bull queue instance
- Provides health check utilities
- Handles graceful shutdown

### 2. **Job Processors** (`worker/src/queue/jobs/daily-calls.ts`)
- **processScheduleCalls**: Finds users who need calls at current time
- **processUserCall**: Initiates individual call for a user (with retry support)
- Each processor is registered by name in the worker

### 3. **Worker Process** (`worker/src/queue/worker.ts`)
- Registers named processors for each job type (Bull best practice)
- **schedule-calls**: Concurrency of 1 (cron scheduler)
- **process-user-call**: Concurrency of 5 (parallel call processing)
- Runs cron job every 5 minutes to check for users

### 4. **Call Service** (`packages/shared/src/services/call-service.ts`)
- Reusable call initiation logic
- Timezone-aware user selection
- Prevents duplicate initial calls per day (allows retries)
- **Automatic retry scheduling**: Schedules up to 2 retries (30 min intervals) for failed/unanswered calls

### 5. **API Routes**
- `POST /api/queue/trigger` - Manual trigger for testing
- `GET /api/queue/status` - Queue health and statistics
- `GET /api/admin/queues` - Bull Board dashboard info
- `POST /api/webhooks/call` - Generic webhook for call status updates (auto-schedules retries)

## Call Retry System

### Overview

The system automatically retries failed or unanswered calls **without requiring database changes**. It uses Bull's delayed job feature to schedule retries.

### Retry Configuration

**Constants** (defined in `packages/shared/src/queue/types.ts`):
- `MAX_RETRIES`: 2 (total of 3 attempts: 1 initial + 2 retries)
- `RETRY_DELAY_MS`: 1,800,000 ms (30 minutes)
- `RETRY_ON_STATUSES`: `['failed', 'no_answer', 'busy', 'no-answer']`

### How It Works

1. **Initial Call**: User receives a call at their scheduled time
2. **Status Update**: Webhook receives call status from provider
3. **Retry Decision**: If status is in `RETRY_ON_STATUSES`, system checks retry count
4. **Schedule Retry**: If under max retries, schedules a delayed job for 30 minutes later
5. **Retry Execution**: Worker processes the delayed job and initiates another call
6. **Repeat**: Process continues until call succeeds or max retries reached

### Retry Flow

```
Initial Call (9:00 PM)
    │
    ├─ [Completed] ──> No retry needed ✓
    │
    └─ [Failed/No Answer/Busy]
        │
        └─> Schedule Retry 1 (9:30 PM)
            │
            ├─ [Completed] ──> Success ✓
            │
            └─ [Failed/No Answer/Busy]
                │
                └─> Schedule Retry 2 (10:00 PM)
                    │
                    ├─ [Completed] ──> Success ✓
                    │
                    └─ [Failed] ──> Max retries reached ✗
```

### Implementation Details

**No Database Changes Required:**
- Retry count tracked by counting today's call records
- Original call ID passed through job metadata
- Duplicate check bypassed for retry attempts

**Key Functions:**
- `scheduleRetryIfNeeded()` - Checks status and schedules retry job
- `initiateCall()` - Accepts `retryCount` parameter to allow retries
- `processUserCall()` - Passes retry information through the chain

### Monitoring Retries

**Log Messages:**
```
[CallService] Scheduled retry 1/2 for call {id} in 30 minutes
[Job:{id}] Processing user call for {name} (retry 1/2)
[CallService] Call {id} - max retries (2) reached
```

**Queue Status:**
Check delayed jobs via `/api/queue/status` endpoint.

## Database Schema

### Migration: `20251031_add_call_preferences.sql`

```sql
ALTER TABLE public.users
  ADD COLUMN call_enabled BOOLEAN DEFAULT true,
  ADD COLUMN call_time TIME DEFAULT '20:30:00';
```

- `call_enabled`: Enable/disable automated calls for user
- `call_time`: Preferred call time in user's local timezone (format: `HH:MM:SS`)

## Environment Variables

Add to your `.env.local`:

```bash
# Redis connection
REDIS_URL=redis://localhost:6379
# For Docker: REDIS_URL=redis://redis:6379

# Worker concurrency (parallel job processing)
QUEUE_CONCURRENCY=5

# CallKaro webhook secret (optional, for signature verification)
CALLKARO_WEBHOOK_SECRET=your-webhook-secret

# Existing CallKaro config (already required)
CALLKARO_API_KEY=your-api-key
CALLKARO_BASE_URL=https://api.callkaro.ai
CALLKARO_AGENT_ID=your-agent-id

# Supabase service role key (for background jobs)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Setup & Installation

### 1. Install Dependencies

**Main App:**
```bash
npm install
```

**Worker (separate service):**
```bash
cd worker
npm install
cd ..
```

### 2. Run Database Migration

```bash
npx supabase db push
# or
npx supabase migration up
```

### 3. Start Services

**Development (Local):**

Terminal 1 - Redis:
```bash
redis-server
```

Terminal 2 - Worker:
```bash
npm run worker:dev
```

Terminal 3 - Next.js:
```bash
npm run dev
```

**Production (Docker - Recommended):**
```bash
docker compose up --build
```

This starts all three services:
- `relevel-redis`: Redis server
- `relevel-worker`: Queue worker
- `relevel-me`: Next.js app

## Docker Deployment

The `docker-compose.yml` includes three services:

1. **redis** - Redis server for queue
2. **relevel-me** - Next.js application
3. **relevel-worker** - Queue worker process

```bash
# Start all services
docker-compose up -d

# View worker logs
docker logs -f relevel-worker

# View redis logs
docker logs -f relevel-redis

# Restart worker
docker-compose restart relevel-worker
```

## Usage

### Automated Daily Calls

The worker automatically:
1. Runs cron job every 5 minutes (pattern: `*/5 * * * *`)
2. Queries users where:
   - `call_enabled = true`
   - Current time in user's timezone matches their `call_time` (±5 min window)
   - No successful call today
3. Enqueues individual call jobs for each user
4. Processes calls with automatic retry on failure:
   - Up to 3 total attempts (1 initial + 2 retries)
   - 30-minute delay between attempts
   - Triggered automatically by webhook on failed/unanswered calls

### Manual Trigger (Testing)

```bash
curl -X POST http://localhost:3000/api/queue/trigger \
  -H "Cookie: your-auth-cookie"
```

Or from your app:
```typescript
const response = await fetch('/api/queue/trigger', { method: 'POST' });
```

### Check Queue Status

```bash
curl http://localhost:3000/api/queue/status \
  -H "Cookie: your-auth-cookie"
```

Response:
```json
{
  "success": true,
  "queue": {
    "name": "daily-calls",
    "health": "healthy",
    "active": 2,
    "waiting": 5,
    "failed": 0,
    "completed": 127,
    "crons": [
      {
        "name": "schedule-calls",
        "cron": "*/5 * * * *",
        "next": 1730350800000
      }
    ]
  }
}
```

## User Configuration

Users can configure their call preferences:

```sql
-- Enable calls
UPDATE users SET call_enabled = true WHERE id = 'user-id';

-- Disable calls
UPDATE users SET call_enabled = false WHERE id = 'user-id';

-- Set call time to 9:00 PM
UPDATE users SET call_time = '21:00:00' WHERE id = 'user-id';

-- Set timezone
UPDATE users SET local_tz = 'America/New_York' WHERE id = 'user-id';
```

## Monitoring & Debugging

### View Queue Dashboard

```bash
curl http://localhost:3000/api/admin/queues
```

### Check Worker Logs

```bash
# Development
# Worker outputs directly to console

# Docker
docker logs -f relevel-worker
```

### Common Log Messages

- `[Worker] Worker started successfully` - Worker is running
- `[Queue] Processing job {id} ({name})` - Job started
- `[Job:{id}] Found {n} users to call` - Users scheduled
- `[CallService] Call initiated successfully` - Call started
- `[Webhook:CallKaro] Updated call: {status}` - Status update received

### Failed Jobs

Failed jobs are automatically retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: After 2 seconds
- Attempt 3: After 4 seconds

After 3 failures, job moves to failed queue (kept for debugging).

## Webhook Integration

### Call Provider Webhook Setup

1. Go to your call provider dashboard (CallKaro, Vapi, etc.)
2. Set webhook URL: `https://your-domain.com/api/webhooks/call`
3. (Optional) Set webhook secret in `.env.local`

### Webhook Payload

Call providers send status updates for:
- `ringing` - Call initiated
- `in_progress` - User answered
- `completed` - Call finished successfully ✓ (no retry)
- `failed` - Call failed ⟳ (triggers retry)
- `no_answer` / `no-answer` - User didn't answer ⟳ (triggers retry)
- `busy` - User line was busy ⟳ (triggers retry)

**Automatic Retry Scheduling:**
When webhook receives a failed/unanswered status, the system automatically:
1. Counts existing call attempts for the user today
2. If under max retries (2), schedules a new call job with 30-min delay
3. Returns `retry_scheduled: true` in webhook response

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Check worker is running:
   ```bash
   docker ps | grep relevel-worker
   # or check process list
   ```

3. Check worker logs for errors

### Calls not being scheduled

1. Verify user configuration:
   ```sql
   SELECT id, call_enabled, call_time, local_tz
   FROM users
   WHERE call_enabled = true;
   ```

2. Check if user already has call today:
   ```sql
   SELECT * FROM calls
   WHERE user_id = 'user-id'
   AND created_at >= current_date;
   ```

3. Verify timezone calculation is correct

### Redis connection errors

- Ensure Redis is running: `docker ps` or `redis-cli ping`
- Check `REDIS_URL` environment variable
- For Docker: Use `redis://redis:6379` (service name)
- For local: Use `redis://localhost:6379`

## Performance

### Concurrency

Adjust `QUEUE_CONCURRENCY` based on:
- CallKaro API rate limits
- Server resources
- Expected call volume

Default: 5 concurrent jobs

### Cron Frequency

Default: Every 5 minutes (`*/5 * * * *`)

To change, edit `CRON_PATTERNS.CHECK_USERS` in `web/lib/queue/types.ts`.

### Job Retention

- Completed jobs: Last 100 kept
- Failed jobs: Last 500 kept
- Schedule jobs: Last 10 completed, 50 failed

Adjust in `web/lib/queue/types.ts` if needed.

## Security Notes

1. **Webhook Secret**: Implement signature verification in production
2. **Dashboard Access**: Add role-based access control for `/api/admin/queues`
3. **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never expose client-side)
4. **Redis**: Use password authentication in production
5. **Rate Limiting**: Consider adding rate limits to manual trigger endpoint

## Future Enhancements

- [ ] Bull Board full UI dashboard
- [x] Call retry logic for failed calls (✓ Implemented: 3 attempts, 30-min intervals)
- [ ] User notification preferences (SMS, email)
- [ ] Call scheduling window (only call during X-Y hours)
- [ ] Analytics dashboard for call metrics
- [ ] A/B testing for different agent scripts
- [ ] Voice call recording transcription analysis
- [ ] Configurable retry delays per user
- [ ] Smart retry scheduling (avoid late night retries)

## Support

For issues or questions:
- Check worker logs: `docker logs relevel-worker`
- Check queue status: `GET /api/queue/status`
- Review this documentation
- Check CallKaro API status
