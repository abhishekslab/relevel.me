# relevel.me Architecture

> High-level architecture overview of the relevel.me monorepo

## Table of Contents

- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Key Components](#key-components)
- [Deployment](#deployment)

---

## Monorepo Structure

relevel.me uses **npm workspaces** to manage a monorepo with three main packages:

```
relevel.me/                          # Monorepo root
├── web/                             # Next.js web application
│   ├── app/                        # Next.js App Router
│   │   ├── api/                   # API routes
│   │   ├── dashboard/             # Main dashboard
│   │   ├── auth/                  # Authentication flows
│   │   └── ...
│   ├── components/                 # React components
│   │   └── ui/                    # Reusable UI primitives
│   ├── lib/                        # Utilities and services
│   │   ├── auth/                  # Auth helpers (client/server)
│   │   ├── providers/             # Call/payment providers
│   │   ├── queue/                 # Queue client
│   │   └── services/              # Business logic
│   ├── middleware.ts               # Auth middleware
│   └── package.json                # Web dependencies
│
├── worker/                          # Background job processor
│   ├── src/
│   │   ├── queue/                 # Bull queue setup
│   │   └── jobs/                  # Job processors
│   └── package.json                # Worker dependencies
│
├── packages/shared/                 # Shared utilities
│   ├── src/                        # Shared code
│   └── package.json                # Shared dependencies
│
├── supabase/                        # Database migrations
│   └── migrations/                 # SQL migration files
│
├── docs/                            # Documentation
├── .github/workflows/               # CI/CD pipelines
├── docker-compose.yml               # Container orchestration
└── package.json                     # Root workspace config
```

### Package Dependencies

```
web/
  └─> @relevel-me/shared (workspace dependency)

worker/
  └─> @relevel-me/shared (workspace dependency)

packages/shared/
  └─> (no internal dependencies)
```

---

## Technology Stack

### Frontend (web/)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **3D Graphics**: Three.js, React Three Fiber
- **Animation**: Framer Motion
- **State**: React hooks, client-side state
- **Auth**: Supabase Auth (magic links)

### Backend Services

- **Database**: Supabase (PostgreSQL with pgvector extension)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Queue**: Bull + Redis
- **Worker**: Node.js background processor

### AI/ML Stack (Local-First)

- **LLM (Local)**: Ollama with llama3.2 (baked into Docker image)
- **LLM (Cloud)**: OpenRouter API (Claude, GPT-4, Gemini, etc.)
- **Embeddings (Local)**: Xenova/all-MiniLM-L6-v2 via Transformers.js (384D, in-process)
- **Embeddings (Cloud)**: OpenAI text-embedding-3-small/large, HuggingFace API
- **Vector Search**: pgvector for semantic memory retrieval
- **Provider Pattern**: Pluggable architecture for swapping LLM/embedding providers

### Infrastructure

- **Container**: Docker + Docker Compose
- **Local LLM**: Ollama (docker-compose.ollama.yml)
- **CI/CD**: GitHub Actions
- **Deployment**: Docker containers (self-hosted)

### External Services

- **Voice Calls**: CallKaro / Vapi (abstracted via provider pattern)
- **Payments**: DodoPayments
- **3D Avatars**: Ready Player Me

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │            Next.js Web App (web/)                  │    │
│  │                                                     │    │
│  │  • Dashboard UI (3D avatar, quest dock)             │    │
│  │  • API Routes (/api/*)                             │    │
│  │  • Auth flows (/auth/callback)                     │    │
│  │  • Middleware (session checks)                     │    │
│  └─────────────┬───────────────────┬──────────────────┘    │
└────────────────┼───────────────────┼───────────────────────┘
                 │                   │
                 │                   │
        ┌────────▼────────┐   ┌──────▼──────────┐
        │   Supabase      │   │   Redis         │
        │   (PostgreSQL)  │   │   (Queue)       │
        │                 │   │                 │
        │  • users        │   │  • daily-calls  │
        │  • skills       │   │    queue        │
        │  • calls        │   └──────┬──────────┘
        │  • subscriptions│          │
        └─────────────────┘          │
                                     │
                          ┌──────────▼──────────┐
                          │   Worker Process    │
                          │   (worker/)         │
                          │                     │
                          │  • Cron scheduler   │
                          │  • Call processor   │
                          │  • Job handlers     │
                          └──────────┬──────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
          ┌───────▼────────┐               ┌───────────▼──────────┐
          │  CallKaro API  │               │  DodoPayments API   │
          │                │               │                      │
          │  • Voice calls │               │  • Subscriptions     │
          │  • Webhooks    │               │  • Webhooks          │
          └────────────────┘               └──────────────────────┘
```

---

## Data Flow

### User Signup Flow

```
1. User visits /signup
2. Enters email → Supabase Auth sends magic link
3. User clicks link → /auth/callback
4. Callback verifies OTP → creates session
5. Database trigger creates user record
6. Redirect to /onboarding (profile completion)
7. Redirect to /pricing (if no subscription)
8. Redirect to /dashboard (if subscribed)
```

### Call Initiation Flow

```
1. User clicks "Call now" button
2. Frontend POST /api/calls/initiate
3. API creates call record in database
4. API calls CallProvider.initiateCall()
5. Provider makes API call to CallKaro
6. CallKaro initiates phone call
7. Call status updated via webhook
```

### Daily Call Scheduler Flow

```
1. Worker cron runs every 5 minutes
2. Query users needing calls (timezone + call_time)
3. For each user, enqueue job to daily-calls queue
4. Worker processes jobs (concurrency: 5)
5. Each job creates call record + initiates call
6. Webhooks update call status
```

### Subscription Flow

```
1. User visits /pricing
2. Selects plan → POST /api/create-checkout
3. API creates DodoPayments subscription
4. User redirected to DodoPayments checkout
5. User completes payment
6. Webhook receives subscription.active event
7. Database updated with subscription
8. User returns to /dashboard?checkout=success
```

---

## Key Components

### Authentication (web/lib/auth/)

```typescript
// Server-side auth (RSC, API routes, middleware)
import { requireAuth, requireSubscription } from '@/lib/auth/server'

// Client-side auth (client components)
import { createClient } from '@/lib/auth/client'
```

**Features:**
- Magic link authentication
- Session management via cookies
- Row-level security (RLS) policies
- Subscription-based access control

### Call Providers (web/lib/providers/)

Abstraction layer for voice call services:

```typescript
interface CallProvider {
  initiateCall(request): Promise<response>
  parseWebhook(payload): CallWebhookPayload
  verifyWebhookSignature?(payload, signature): boolean
}
```

**Implementations:**
- `CallKaroProvider` - Indian market, production
- `VapiProvider` - Stub implementation
- Extensible for Twilio, Bland AI, etc.

See [PROVIDERS.md](./PROVIDERS.md) for details.

### AI/ML Providers (packages/shared/src/providers/)

Abstraction layer for LLM and embedding services with local-first defaults:

**LLM Provider Interface:**
```typescript
interface LLMProvider {
  generateCompletion(prompt: string, options?): Promise<string>
  generateStream?(prompt: string, options?): AsyncGenerator<string>
}
```

**Implementations:**
- `OllamaProvider` - Local inference with llama3.2 (default, privacy-first)
- `OpenRouterProvider` - Cloud inference (Claude, GPT-4, Gemini, etc.)
- **Auto Mode**: Attempts Ollama first, falls back to OpenRouter if unavailable

**Embedding Provider Interface:**
```typescript
interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>
  generateBatch(texts: string[]): Promise<number[][]>
}
```

**Implementations:**
- `LocalEmbeddingProvider` - Xenova/Transformers.js with all-MiniLM-L6-v2 (default, 100% local)
- `OpenAIEmbeddingProvider` - text-embedding-3-small/large
- `HuggingFaceEmbeddingProvider` - HF Inference API

**Privacy & Performance:**
- Local embeddings run in-process, zero external API calls
- Models cached locally after first download (~23MB)
- Fully offline capable after initial setup
- Cloud providers available as opt-in alternatives

See [EMBEDDINGS.md](./EMBEDDINGS.md) for detailed configuration.

### Queue System (worker/)

Bull-based job queue for background tasks:

```typescript
// Enqueue from web app
import { queueClient } from '@/lib/queue/client'
await queueClient.add('daily-calls', { userId })

// Process in worker
worker.process('daily-calls', async (job) => {
  // Handle call initiation
})
```

See [QUEUE_SYSTEM.md](./QUEUE_SYSTEM.md) for details.

### 3D Avatar System (web/lib/)

Ready Player Me integration with lip-sync:

- **Visage**: Lightweight 3D avatar viewer
- **Lip-sync**: Browser TTS with viseme mapping
- **Animation**: Idle animations with morph targets

See [VISAGE_INTEGRATION.md](./VISAGE_INTEGRATION.md) and [LIPSYNC_ROADMAP.md](./LIPSYNC_ROADMAP.md).

---

## Deployment

### Docker Compose

**Production Setup** (`docker-compose.yml`):
```yaml
services:
  relevel-me:
    build: .
    ports:
      - "3001:3000"
    depends_on:
      - redis
    environment:
      - NEXT_PUBLIC_SUPABASE_URL
      - SUPABASE_SERVICE_ROLE_KEY
      - REDIS_URL=redis://redis:6379

  worker:
    build:
      context: .
      dockerfile: worker/Dockerfile
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - NEXT_PUBLIC_SUPABASE_URL
      - SUPABASE_SERVICE_ROLE_KEY
      - CALLKARO_API_KEY

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Development Setup with Ollama** (`docker-compose.dev.yml` + `docker-compose.ollama.yml`):
```bash
# Start all services including local LLM
docker compose -f docker-compose.dev.yml -f docker-compose.ollama.yml up --build
```

The Ollama service provides:
- llama3.2 model pre-loaded in Docker image
- Local inference endpoint at `http://ollama:11434`
- Automatic health checks and GPU support (if available)
- Zero external API calls for LLM inference

### CI/CD Pipeline

GitHub Actions runs on every push to `main`:

1. **Build Job** (matrix: Node 18.x, 20.x)
   - Typecheck shared package
   - Build shared package
   - Typecheck worker
   - Build worker
   - Typecheck web app
   - Build web app
   - Verify build artifacts

2. **Docker Job**
   - Build Docker images
   - Start services
   - Health check web service
   - Verify containers

See [.github/workflows/ci.yml](../.github/workflows/ci.yml).

---

## Database Schema

### Core Tables

**users**
- `id` (uuid, PK)
- `auth_user_id` (uuid, FK → auth.users)
- `email`, `phone`, `first_name`
- `avatar_url`, `avatar_gender`
- `local_tz`, `call_time`, `evening_window`

**skills**
- Predefined skill catalog
- Categorized by type (technical, personal development, etc.)

**user_skills**
- User progress on skills
- XP, level, discovered status
- Due dates for reviews

**calls**
- Call history
- Status tracking (queued, ringing, in_progress, completed)
- Transcript, recording URL
- Linked to vendor (CallKaro ID)

**subscriptions**
- User subscription status
- Tier (free, pro)
- DodoPayments integration
- Period start/end dates

**checkpoints**
- Scheduled reviews
- Skill items due for practice

### Triggers

**handle_new_auth_user()**
- Fires on `auth.users` INSERT
- Creates corresponding `public.users` record
- Links via `auth_user_id`

---

## Security

### Authentication

- Magic link authentication (passwordless)
- JWT sessions stored in HTTP-only cookies
- Server-side session validation in middleware

### Authorization

- Row-level security (RLS) policies on all tables
- Subscription-based feature gating
- Service role key used only in backend (worker, API routes)

### Secrets Management

- Environment variables for all secrets
- `.env` files gitignored
- Docker secrets for production

### API Security

- CORS configured for same-origin only
- Rate limiting on API routes
- Webhook signature verification

---

## Monitoring & Observability

### Logging

- Structured logging with `console.log` (upgrade to Pino/Winston recommended)
- Docker container logs accessible via `docker compose logs`

### Queue Monitoring

- Bull dashboard at `/api/admin/queues`
- Job status, retries, failures visible

### Database

- Supabase Dashboard for query insights
- RLS policy testing tools

---

## Development

### Local Setup

**Option 1: Docker (Recommended)**
```bash
# Start all services with local LLM (Ollama + llama3.2)
docker compose -f docker-compose.dev.yml -f docker-compose.ollama.yml up --build

# Access web app at http://localhost:3000
# Ollama API available at http://localhost:11434
```

**Option 2: npm (requires manual service setup)**
```bash
# Install dependencies (all workspaces)
npm install

# Start web dev server
npm run dev

# Start worker (optional, in separate terminal)
cd worker && npm run dev

# Typecheck all packages
npm run typecheck
```

### Testing

```bash
# Run type checks
npm run typecheck

# Build all packages
npm run build

# Test with Docker Compose (production mode)
docker compose up --build
```

---

## Migration Guide

### Adding a New Workspace Package

1. Create directory: `packages/new-package/`
2. Add `package.json` with `name: "@relevel-me/new-package"`
3. Add to root `package.json` workspaces array
4. Reference in dependent packages: `"@relevel-me/new-package": "*"`

### Adding a New Call Provider

See [PROVIDERS.md](./PROVIDERS.md) for step-by-step guide.

### Adding a New Job Type

See [QUEUE_SYSTEM.md](./QUEUE_SYSTEM.md) for job creation guide.

---

## Future Architecture Considerations

### Scalability

- **Horizontal scaling**: Multiple worker instances (Redis handles coordination)
- **Database**: Supabase scales with read replicas
- **Caching**: Add Redis cache layer for user sessions, skill data

### Reliability

- **Job retries**: Bull handles automatic retries
- **Dead letter queue**: Failed jobs archived for investigation
- **Health checks**: Add `/health` endpoint for container orchestration

### Performance

- **CDN**: Serve static assets from CDN
- **SSR optimization**: Incremental static regeneration for dashboard
- **Database indexing**: Add indexes on frequently queried fields

---

**Last Updated:** 2025-11-12
**Version:** 1.1 (Monorepo + Local-First AI/ML)
