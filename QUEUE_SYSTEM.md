# Queue System Documentation

## Overview

The queue system enables automated daily calls to users using **Redis** and **Bull** queue. It runs as a separate worker process that schedules and processes calls based on user preferences (timezone and preferred call time).

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (Port 3000)    │
└────────┬────────┘
         │
         ├─── API Routes (/api/queue/*)
         │
         │    ┌──────────────┐
         └────│    Redis     │────┐
              │  (Port 6379) │    │
              └──────────────┘    │
                                  │
                          ┌───────┴────────┐
                          │ Worker Process │
                          │ (Bull Consumer)│
                          └────────────────┘
                                  │
                          ┌───────┴────────┐
                          │  CallKaro API  │
                          └────────────────┘
```

## Components

### 1. **Queue Client** (`lib/queue/client.ts`)
- Initializes Redis connection
- Creates Bull queue instance
- Provides health check utilities
- Handles graceful shutdown

### 2. **Job Processors** (`lib/queue/jobs/daily-calls.ts`)
- **processScheduleCalls**: Finds users who need calls at current time
- **processUserCall**: Initiates individual call for a user
- Each processor is registered by name in the worker

### 3. **Worker Process** (`lib/queue/worker.ts`)
- Registers named processors for each job type (Bull best practice)
- **schedule-calls**: Concurrency of 1 (cron scheduler)
- **process-user-call**: Concurrency of 5 (parallel call processing)
- Runs cron job every 5 minutes to check for users

### 4. **Call Service** (`lib/services/call-service.ts`)
- Reusable call initiation logic
- Timezone-aware user selection
- Prevents duplicate calls per day

### 5. **API Routes**
- `POST /api/queue/trigger` - Manual trigger for testing
- `GET /api/queue/status` - Queue health and statistics
- `GET /api/admin/queues` - Bull Board dashboard info
- `POST /api/webhooks/callkaro` - Webhook for call status updates

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

Already done:
```bash
npm install bull ioredis @bull-board/api @bull-board/ui
npm install --save-dev @types/bull tsx dotenv
```

### 2. Run Database Migration

```bash
npx supabase db push
# or
npx supabase migration up
```

### 3. Start Redis

**Option A: Local Redis**
```bash
redis-server
```

**Option B: Docker (Recommended)**
```bash
docker-compose up redis -d
```

### 4. Start the Worker

**Development:**
```bash
npm run worker
```

**Production:**
```bash
npm run build
npm run worker:prod
```

### 5. Start Next.js App

```bash
npm run dev    # Development
npm start      # Production
```

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
   - No call today (status: queued/ringing/in_progress/completed)
3. Enqueues individual call jobs for each user
4. Processes calls with retry logic (2 attempts)

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

### CallKaro Webhook Setup

1. Go to CallKaro dashboard
2. Set webhook URL: `https://your-domain.com/api/webhooks/callkaro`
3. (Optional) Set webhook secret in `.env.local`

### Webhook Payload

CallKaro sends updates for:
- `ringing` - Call initiated
- `in_progress` - User answered
- `completed` - Call finished successfully
- `failed` - Call failed
- `no_answer` - User didn't answer
- `busy` - User line was busy

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

To change, edit `CRON_PATTERNS.CHECK_USERS` in `lib/queue/types.ts`.

### Job Retention

- Completed jobs: Last 100 kept
- Failed jobs: Last 500 kept
- Schedule jobs: Last 10 completed, 50 failed

Adjust in `lib/queue/types.ts` if needed.

## Security Notes

1. **Webhook Secret**: Implement signature verification in production
2. **Dashboard Access**: Add role-based access control for `/api/admin/queues`
3. **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never expose client-side)
4. **Redis**: Use password authentication in production
5. **Rate Limiting**: Consider adding rate limits to manual trigger endpoint

## Future Enhancements

- [ ] Bull Board full UI dashboard
- [ ] Call retry logic for failed calls
- [ ] User notification preferences (SMS, email)
- [ ] Call scheduling window (only call during X-Y hours)
- [ ] Analytics dashboard for call metrics
- [ ] A/B testing for different agent scripts
- [ ] Voice call recording transcription analysis

## Support

For issues or questions:
- Check worker logs: `docker logs relevel-worker`
- Check queue status: `GET /api/queue/status`
- Review this documentation
- Check CallKaro API status
