# @relevel-me/shared

> Shared utilities and services for the relevel.me monorepo

## Overview

This package contains code shared between the `web` and `worker` packages, including:

- **Configuration**: Environment variable management
- **Call Providers**: Voice call provider abstractions (CallKaro, Vapi, etc.)
- **Embedding Providers**: Text embedding provider abstractions (Local, OpenAI, HuggingFace)
- **Queue Client**: Bull queue client for background jobs
- **Queue Types**: Shared TypeScript types for Bull queue jobs
- **Services**: Shared business logic (call service with retry support, Supabase integration)

## Installation

This is a workspace package and should be referenced via workspace protocol:

```json
{
  "dependencies": {
    "@relevel-me/shared": "*"
  }
}
```

## Usage

### In Web App

```typescript
// web/app/api/calls/initiate/route.ts
import { getCallProvider } from '@relevel-me/shared'

const provider = getCallProvider()
const result = await provider.initiateCall({
  toNumber: '+1234567890',
  agentId: 'agent-123',
  metadata: { call_id: 'uuid' }
})
```

### In Worker

```typescript
// worker/src/jobs/daily-calls.ts
import { CallService, queueClient } from '@relevel-me/shared'

const callService = new CallService()
await callService.initiateCall(userId)
```

## Directory Structure

```
packages/shared/
├── src/
│   ├── config.ts                    # Configuration utilities
│   ├── index.ts                     # Main exports
│   ├── providers/                   # Call provider abstractions
│   │   ├── call-provider.ts        # Provider interface
│   │   ├── factory.ts              # Provider factory
│   │   └── implementations/        # Provider implementations
│   │       ├── callkaro-provider.ts
│   │       └── vapi-provider.ts
│   ├── queue/                       # Queue utilities
│   │   ├── client.ts               # Bull queue client
│   │   └── types.ts                # Queue types
│   └── services/                    # Shared services
│       └── call-service.ts         # Call service
├── dist/                            # Compiled JavaScript (gitignored)
├── package.json
└── tsconfig.json
```

## Exports

### Configuration

```typescript
import { getEnvVar, validateConfig } from '@relevel-me/shared'

// Get required environment variable
const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')

// Validate configuration
const { valid, errors } = validateConfig()
if (!valid) {
  console.error('Configuration errors:', errors)
}
```

### Call Providers

#### Interface

```typescript
import type { CallProvider, InitiateCallRequest, InitiateCallResponse } from '@relevel-me/shared'

interface CallProvider {
  readonly name: string
  readonly requiresAgentId: boolean

  initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse>
  parseWebhook(rawPayload: any): CallWebhookPayload
  verifyWebhookSignature?(payload: string, signature: string): boolean
}
```

#### Factory

```typescript
import { getCallProvider } from '@relevel-me/shared'

// Get configured provider (based on CALL_PROVIDER env var)
const provider = getCallProvider()

// Initiate call
const response = await provider.initiateCall({
  toNumber: '+1234567890',
  agentId: 'my-agent-id',
  metadata: {
    call_id: 'uuid',
    user_id: 'uuid',
  }
})

if (response.success) {
  console.log('Call initiated:', response.vendorCallId)
} else {
  console.error('Call failed:', response.error)
}
```

#### Supported Providers

- **CallKaro** (`callkaro`) - Production ready, Indian market
- **Vapi** (`vapi`) - Stub implementation

See [docs/PROVIDERS.md](../../docs/PROVIDERS.md) for adding new providers.

### Embedding Providers

#### Interface

```typescript
import type { EmbeddingProvider, EmbedRequest, EmbedResult } from '@relevel-me/shared'

interface EmbeddingProvider {
  readonly name: string
  readonly modelName: string
  readonly dimensions: number
  readonly supportsBatching: boolean

  embed(request: EmbedRequest): Promise<EmbedResult>
  embedBatch?(requests: EmbedRequest[]): Promise<EmbedResult[]>
}
```

#### Factory

```typescript
import { getEmbeddingProvider } from '@relevel-me/shared'

// Get configured provider (based on EMBEDDING_PROVIDER env var)
const provider = await getEmbeddingProvider()

console.log('Provider:', provider.name)
console.log('Model:', provider.modelName)
console.log('Dimensions:', provider.dimensions)

// Generate embedding
const result = await provider.embed({
  text: 'This is a test memory',
  metadata: { user_id: 'uuid', message_id: 'uuid' }
})

console.log('Embedding:', result.embedding)  // Float array
console.log('Dimensions:', result.dims)       // e.g., 384 or 1536
```

#### Supported Providers

- **Local** (`local`) - Free, offline-capable, uses @xenova/transformers (default)
- **OpenAI** (`openai`) - High quality, API-based, 1536 dimensions
- **HuggingFace** (`huggingface`) - Various models via Inference API

**Environment Variables:**

```bash
# Local provider (default, no API key needed)
EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2  # Optional
LOCAL_EMBEDDING_DIMS=384  # Optional
LOCAL_EMBEDDING_CACHE_DIR=/path/to/cache  # Optional

# OpenAI provider
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...  # Required
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional
OPENAI_EMBEDDING_DIMS=1536  # Optional

# HuggingFace provider
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=hf_...  # Required
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2  # Optional
```

See [docs/EMBEDDINGS.md](../../docs/EMBEDDINGS.md) for comprehensive embedding provider documentation.

### Queue Client

```typescript
import { queueClient, type DailyCallJobData } from '@relevel-me/shared'

// Add job to queue
await queueClient.add<DailyCallJobData>('process-user-call', {
  userId: 'uuid',
  scheduledAt: new Date().toISOString()
})

// Get queue stats
const stats = await queueClient.getQueueStats('daily-calls')
console.log('Active jobs:', stats.active)
console.log('Waiting jobs:', stats.waiting)
```

### Call Service

```typescript
import { initiateCall, scheduleRetryIfNeeded } from '@relevel-me/shared'

// Initiate call for user
const result = await initiateCall({
  userId: 'user-uuid',
  phone: '+1234567890',
  name: 'John Doe'
})

if (result.success) {
  console.log('Call created:', result.callId)
} else {
  console.error('Call failed:', result.error)
}

// Schedule retry if needed (called by webhook handler)
const retryScheduled = await scheduleRetryIfNeeded({
  callId: 'call-uuid',
  userId: 'user-uuid',
  phone: '+1234567890',
  name: 'John Doe',
  status: 'no_answer', // Triggers retry
  retryCount: 0 // First retry
})
```

## Development

### Building

```bash
# Build TypeScript
npm run build

# Watch mode (development)
npm run dev

# Type check
npm run typecheck
```

### Testing

```bash
# Type check all code
npm run typecheck

# Run from monorepo root
cd ../.. && npm run typecheck
```

## Adding New Exports

1. Create your module in `src/`
2. Add export to `src/index.ts`:
   ```typescript
   export * from './your-module'
   ```
3. Build the package:
   ```bash
   npm run build
   ```
4. Import in dependent packages:
   ```typescript
   import { YourExport } from '@relevel-me/shared'
   ```

## TypeScript Configuration

This package uses `tsconfig.json` configured for library compilation:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

## Environment Variables

This package reads environment variables from:
- Root `.env` file (monorepo)
- Process environment (`process.env`)

### Required Variables

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Call Provider (CallKaro):**
- `CALLKARO_API_KEY`
- `CALLKARO_BASE_URL`
- `CALLKARO_AGENT_ID`

**Call Provider (Vapi):**
- `VAPI_API_KEY`
- `VAPI_BASE_URL`
- `VAPI_ASSISTANT_ID`

**Embedding Provider (Local):**
- `EMBEDDING_PROVIDER` (default: `local`)
- `LOCAL_EMBEDDING_MODEL` (optional)
- `LOCAL_EMBEDDING_DIMS` (optional)
- `LOCAL_EMBEDDING_CACHE_DIR` (optional)

**Embedding Provider (OpenAI):**
- `OPENAI_API_KEY` (required for openai provider)
- `OPENAI_EMBEDDING_MODEL` (optional)
- `OPENAI_EMBEDDING_DIMS` (optional)

**Embedding Provider (HuggingFace):**
- `HUGGINGFACE_API_KEY` (required for huggingface provider)
- `HUGGINGFACE_EMBEDDING_MODEL` (optional)

**Queue:**
- `REDIS_URL`

**Provider Selection:**
- `CALL_PROVIDER` (default: `callkaro`)
- `EMBEDDING_PROVIDER` (default: `local`)

## Best Practices

### 1. Keep Dependencies Minimal

Only add dependencies that are truly shared between web and worker. Avoid adding frontend-specific or worker-specific dependencies.

### 2. Use TypeScript

All code should be written in TypeScript with proper types exported.

### 3. Avoid Side Effects

Exports should be pure functions or classes. Avoid module-level side effects (e.g., database connections on import).

### 4. Document Exports

Add JSDoc comments to all exported interfaces and functions:

```typescript
/**
 * Initiates a phone call via the configured provider
 * @param request - Call request details
 * @returns Promise resolving to call response
 */
export async function initiateCall(request: InitiateCallRequest): Promise<InitiateCallResponse>
```

### 5. Version Management

This package follows the same version as the monorepo root. Update `package.json` version when making breaking changes.

## Common Patterns

### Singleton Pattern (Services)

```typescript
// services/my-service.ts
export class MyService {
  private static instance: MyService

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService()
    }
    return MyService.instance
  }

  private constructor() {
    // Initialize
  }
}
```

### Factory Pattern (Providers)

```typescript
// providers/factory.ts
export function getProvider(): Provider {
  const type = process.env.PROVIDER_TYPE

  switch (type) {
    case 'provider-a':
      return new ProviderA()
    case 'provider-b':
      return new ProviderB()
    default:
      throw new Error(`Unknown provider: ${type}`)
  }
}
```

## Troubleshooting

### Module Not Found

If you get "Cannot find module '@relevel-me/shared'":

1. Ensure package is built:
   ```bash
   cd packages/shared && npm run build
   ```

2. Verify workspace configuration in root `package.json`:
   ```json
   {
     "workspaces": ["packages/*", "web", "worker"]
   }
   ```

3. Reinstall dependencies:
   ```bash
   npm install
   ```

### Type Errors

If TypeScript can't find types:

1. Rebuild the package:
   ```bash
   npm run build
   ```

2. Check `tsconfig.json` has proper paths:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@relevel-me/shared": ["../packages/shared/src"]
       }
     }
   }
   ```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

---

**Part of relevel.me monorepo** - See [root README](../../README.md) for full project overview.
