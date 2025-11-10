# Logging and Observability Guide

This document describes the comprehensive logging infrastructure implemented for relevel.me to enable production debugging and monitoring.

## Overview

The logging system provides:
- **Structured JSON logging** with Pino (fastest Node.js logger)
- **Error tracking** with Sentry
- **Log aggregation** with Grafana Loki (open-source)
- **Request correlation** with unique request IDs
- **Security** with automatic PII sanitization

## Architecture

### Components

1. **Pino Logger** (`packages/shared/src/logger.ts`)
   - Structured JSON output for production
   - Pretty-printed console output for development
   - Automatic PII sanitization (phone numbers, emails, API keys)
   - Contextual child loggers for different services

2. **Sentry Error Tracking**
   - Client-side: `web/sentry.client.config.ts`
   - Server-side: `web/sentry.server.config.ts`
   - Edge runtime: `web/sentry.edge.config.ts`
   - Worker: `worker/src/sentry.ts`
   - Shared: `packages/shared/src/sentry.ts`

3. **Grafana Loki Stack** (`docker-compose.logging.yml`)
   - **Loki**: Log aggregation system
   - **Promtail**: Log shipping agent
   - **Grafana**: Visualization and dashboards

## Quick Start

### 1. Install Dependencies

Dependencies are already installed:
- `pino` - Core logging library
- `pino-pretty` - Pretty printing for development
- `@sentry/nextjs` - Error tracking for Next.js
- `@sentry/node` - Error tracking for Node.js (worker)

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Sentry (Error Tracking)
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Log Level (optional, defaults to 'info' in production, 'debug' in development)
LOG_LEVEL=info

# Service Name (optional, for identifying logs)
SERVICE_NAME=relevel-me
```

### 3. Start Log Aggregation Stack (Optional)

For local development or self-hosted production:

```bash
# Start Grafana + Loki + Promtail
docker-compose -f docker-compose.logging.yml up -d

# Access Grafana at http://localhost:3001
# No login required (anonymous access enabled for development)
```

### 4. View Logs

**Development:**
```bash
# Web app logs (pretty-printed)
npm run dev

# Worker logs (pretty-printed)
cd worker && npm run dev
```

**Production:**
```bash
# JSON output to stdout (captured by Docker/PM2/systemd)
npm start

# View in Grafana Loki
# Navigate to http://localhost:3001 -> Explore -> Select Loki data source
```

## Usage Examples

### Basic Logging

```typescript
import { logger } from '@relevel-me/shared';

// Info level
logger.info({ userId: '123', action: 'login' }, 'User logged in');

// Error level
logger.error({ userId: '123', error: err.message }, 'Login failed');

// Debug level (only shown in development or LOG_LEVEL=debug)
logger.debug({ queryTime: 150 }, 'Database query completed');
```

### Contextual Logging

```typescript
import { createChildLogger } from '@relevel-me/shared';

// Create a logger with context
const serviceLogger = createChildLogger({ service: 'PaymentService' });

serviceLogger.info({ amount: 100, currency: 'USD' }, 'Processing payment');
// Output: { service: 'PaymentService', amount: 100, currency: 'USD', msg: 'Processing payment' }
```

### Request Correlation

```typescript
import { createRequestLogger } from '@relevel-me/shared';

export async function POST(req: NextRequest) {
  const logger = createRequestLogger();  // Generates unique requestId

  logger.info('Processing request');  // Includes requestId in all logs
  // ... rest of handler

  return NextResponse.json({ success: true });
}
```

### Helper Functions

```typescript
import {
  logSuccess,
  logError,
  logApiRequest,
  logApiResponse,
  logDatabaseQuery,
  logDatabaseError,
} from '@relevel-me/shared';

// Log successful operations
logSuccess(logger, 'Payment processed', { orderId: '123', amount: 100 });

// Log errors with full context
logError(logger, 'Payment failed', error, { orderId: '123' });

// Log API calls
logApiRequest(logger, 'POST', '/api/stripe/charge', { amount: 100 });
logApiResponse(logger, 'POST', '/api/stripe/charge', 200, 250, { chargeId: 'ch_123' });

// Log database operations
logDatabaseQuery(logger, 'INSERT', 'orders', { orderId: '123' });
logDatabaseError(logger, 'UPDATE', 'orders', error, { orderId: '123' });
```

### Sentry Integration

```typescript
import { captureException, addBreadcrumb } from '@relevel-me/shared';

try {
  // Add breadcrumbs for debugging
  addBreadcrumb('Starting payment flow', { userId: '123' }, 'payment');

  // ... your code

  // Capture exceptions with context
  captureException(error, {
    tags: { operation: 'payment', userId: '123' },
    contexts: { payment: { amount: 100, currency: 'USD' } }
  });
} catch (error) {
  captureException(error);
}
```

## Logging Coverage

The following critical paths have comprehensive logging:

### API Routes

1. **`/api/calls/initiate`**
   - Authentication success/failure
   - User profile lookup
   - Phone validation
   - Database operations
   - CallKaro API calls
   - Request/response timing

2. **`/api/webhooks/call`**
   - Webhook receipt
   - Signature verification (now returns 401 on failure)
   - Payload parsing with try-catch
   - Database lookups and updates
   - Retry scheduling

3. **`/api/health`**
   - Supabase connection check
   - Redis connection check
   - CallKaro API reachability
   - Latency measurements

### Services

4. **Call Service** (`packages/shared/src/services/call-service.ts`)
   - Call initiation flow
   - Duplicate call detection
   - Provider selection
   - Database operations
   - User timezone filtering
   - Retry scheduling

5. **CallKaro Provider** (`packages/shared/src/providers/implementations/callkaro-provider.ts`)
   - API key validation (now throws error if missing)
   - API request/response logging
   - Full error details with stack traces
   - Webhook parsing

6. **Provider Factory** (`packages/shared/src/providers/factory.ts`)
   - Provider selection (now logs error instead of warn)
   - Invalid provider detection

### Worker Jobs

7. **Daily Calls Job** (`worker/src/queue/jobs/daily-calls.ts`)
   - Job start/completion
   - User selection results
   - Individual job enqueueing
   - Call initiation results
   - Retry attempts with Bull attempt numbers

## Security Fixes

The following security issues were fixed:

1. **Webhook Signature Verification** (`/api/webhooks/call`)
   - **Before**: Invalid signatures logged as warning, request processed anyway
   - **After**: Returns 401 Unauthorized, captured in Sentry

2. **Webhook Payload Parsing** (`/api/webhooks/call`)
   - **Before**: No try-catch, malformed payloads could crash
   - **After**: Wrapped in try-catch, returns 400 Bad Request

3. **CallKaro API Key Validation** (`callkaro-provider.ts`)
   - **Before**: Missing API key logged as warning, provider continued
   - **After**: Throws error on initialization, captured in Sentry

## PII Sanitization

The logger automatically sanitizes sensitive fields:

```typescript
// Input
logger.info({
  phone: '+15551234567',
  email: 'user@example.com',
  apiKey: 'sk_live_1234567890',
  password: 'secret123'
}, 'User action');

// Output
{
  phone: '***4567',                 // Last 4 digits only
  email: 'u***@example.com',        // First char + domain
  apiKey: '[REDACTED]',             // Completely masked
  password: '[REDACTED]',           // Completely masked
  msg: 'User action'
}
```

## Grafana Loki Queries

### Common Log Queries

```logql
# All logs from web app
{container="relevel-web"}

# Error logs only
{container="relevel-web"} |= "level\":\"error\""

# Logs for specific user
{container="relevel-web"} |= "userId\":\"123\""

# Logs for specific request ID
{container="relevel-web"} |= "requestId\":\"req_\""

# Call initiation flow
{container="relevel-web"} |= "Call initiation"

# Webhook processing
{container="relevel-web"} |= "Webhook"

# Worker job logs
{container="relevel-worker"}

# Failed call attempts
{container="relevel-worker"} |= "Call initiation failed"
```

### Performance Metrics

```logql
# Average API response time
avg_over_time({container="relevel-web"} | json | __error__="" | unwrap duration [5m])

# P95 response time
quantile_over_time(0.95, {container="relevel-web"} | json | __error__="" | unwrap duration [5m])

# Error rate
rate({container="relevel-web"} |= "level\":\"error\"" [5m])
```

## Health Check Endpoint

**Endpoint**: `GET /api/health`

**Response** (200 OK - Healthy):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T13:00:00.000Z",
  "checks": {
    "supabase": { "status": "up", "latency": 45 },
    "redis": { "status": "up", "latency": 12 },
    "callkaro": { "status": "up", "latency": 234 }
  }
}
```

**Response** (503 Service Unavailable - Unhealthy):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-10T13:00:00.000Z",
  "checks": {
    "supabase": { "status": "down", "error": "Connection timeout" },
    "redis": { "status": "up", "latency": 12 },
    "callkaro": { "status": "down", "error": "Network error" }
  }
}
```

Use this endpoint for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Uptime monitoring (UptimeRobot, Pingdom, etc.)

## Troubleshooting

### No Logs Appearing in Grafana

1. Check Promtail is running: `docker-compose -f docker-compose.logging.yml ps`
2. Check Promtail logs: `docker-compose -f docker-compose.logging.yml logs promtail`
3. Verify Docker socket is accessible: `ls -la /var/run/docker.sock`
4. Check Loki ingestion: `curl http://localhost:3100/ready`

### High Log Volume

Adjust log level in production:

```bash
# In .env.local
LOG_LEVEL=warn  # Only log warnings and errors
```

Or use Loki retention policies in `loki-config.yaml`:

```yaml
limits_config:
  retention_period: 168h  # 7 days
```

### Logs Not Sanitizing PII

Check that you're using the shared logger, not console.log:

```typescript
// ❌ Bad - bypasses sanitization
console.log({ phone: user.phone });

// ✅ Good - automatic sanitization
logger.info({ phone: user.phone }, 'User action');
```

## Production Deployment

### Docker/Docker Compose

Logs are automatically sent to stdout/stderr and captured by Docker:

```bash
# View live logs
docker-compose logs -f web
docker-compose logs -f worker

# View logs with Loki
# Promtail automatically scrapes Docker container logs
```

### PM2

```bash
# PM2 automatically captures stdout/stderr
pm2 start npm --name "relevel-web" -- start
pm2 logs relevel-web --json  # JSON format for Loki

# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### Systemd

Create a systemd service that captures logs:

```ini
[Service]
ExecStart=/usr/bin/node /app/dist/index.js
StandardOutput=journal
StandardError=journal
```

Then ship logs to Loki using Promtail's `journal` scrape config.

### Cloud Platforms

**Vercel**: Logs automatically appear in Vercel dashboard
**Railway**: Logs appear in Railway dashboard
**AWS/GCP/Azure**: Use Promtail to ship logs to Loki, or use platform-native log aggregation (CloudWatch, Cloud Logging, Azure Monitor)

## Cost Optimization

**Sentry**:
- Free tier: 5,000 errors/month
- Adjust `tracesSampleRate` in production (currently 0.1 = 10%)

**Grafana Cloud Loki** (if not self-hosting):
- Free tier: 50GB logs/month
- Consider log sampling for high-volume services

**Self-Hosted Loki**:
- Configure retention: Default 7 days, adjust as needed
- Use log level filtering to reduce volume

## Next Steps

1. **Set up Sentry account** and add DSN to environment variables
2. **Configure alerting** in Grafana for critical errors
3. **Create custom dashboards** for call flow visualization
4. **Set up uptime monitoring** using `/api/health` endpoint
5. **Configure log retention** policies based on compliance needs

## Support

For issues or questions about logging:
- Check Grafana Loki docs: https://grafana.com/docs/loki/
- Check Pino docs: https://getpino.io/
- Check Sentry docs: https://docs.sentry.io/

## Summary

With this logging infrastructure in place, you now have:
- ✅ Complete visibility into production call flow
- ✅ Automatic error tracking and alerting
- ✅ Request correlation for debugging
- ✅ PII sanitization for security
- ✅ Health check endpoint for monitoring
- ✅ Open-source log aggregation with Grafana Loki

All 15 critical failure points identified in the analysis now have comprehensive logging, making it possible to debug exactly why calls are failing in production.
