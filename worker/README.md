# Relevel Worker

Background worker service for processing daily calls queue using Bull and Redis.

## Architecture

This is a standalone Node.js service that:
- Processes jobs from the `daily-calls` Bull queue
- Runs cron jobs to schedule calls for users
- Handles parallel processing of user calls
- Communicates with Supabase for user data and call records

## Directory Structure

```
worker/
├── src/
│   ├── index.ts              # Entry point
│   ├── queue/
│   │   ├── client.ts         # Bull queue configuration
│   │   ├── worker.ts         # Job processors
│   │   ├── types.ts          # TypeScript types
│   │   └── jobs/
│   │       └── daily-calls.ts  # Call job handlers
│   └── services/
│       └── call-service.ts   # Supabase integration
├── Dockerfile                # Production container
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Production (Docker)

The worker runs as a separate container in docker-compose:

```bash
# Build and run with docker-compose
docker compose up --build

# Run only the worker
docker compose up worker
```

## Environment Variables

Required environment variables (set in root `.env` file for monorepo):
- `REDIS_URL` - Redis connection URL (default: redis://redis:6379)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for bypassing RLS)
- `CALLKARO_API_KEY` - CallKaro API key
- `CALLKARO_BASE_URL` - CallKaro API base URL
- `CALLKARO_AGENT_ID` - CallKaro agent ID

## Job Types

### schedule-calls
- Runs every 5 minutes via cron
- Checks for users who need calls based on timezone and call_time
- Enqueues individual call jobs

### process-user-call
- Processes individual user calls
- Concurrency: 5 (configurable via QUEUE_CONCURRENCY)
- Creates call record in Supabase
- Initiates call via CallKaro API

## Monitoring

Logs are output to stdout and can be viewed via:
```bash
docker compose logs -f worker
```

Queue dashboard available at: http://localhost:3001/api/admin/queues
