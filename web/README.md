# Relevel Web Application

> Next.js 14 web application for relevel.me - gamified skill tracking dashboard

## Overview

This is the main web application for relevel.me, built with Next.js 14 using the App Router. It provides:

- 3D avatar companion with lip-sync animation
- Voice call integration for daily reflections
- Gamified skill tracking with XP, levels, and streaks
- Subscription-based access control

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **UI**: Shadcn/ui components
- **3D**: Three.js + React Three Fiber
- **Animation**: Framer Motion
- **Auth**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## Directory Structure

```
web/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes
│   │   ├── calls/              # Call initiation
│   │   ├── create-checkout/    # Payment checkout
│   │   └── webhooks/           # Webhook handlers
│   ├── dashboard/               # Main dashboard page
│   ├── auth/                    # Authentication flows
│   │   └── callback/           # Magic link callback
│   ├── pricing/                 # Subscription plans
│   ├── settings/                # User settings
│   ├── signup/                  # User signup
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   └── ui/                      # Reusable UI primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── ...
│
├── lib/                          # Utilities and services
│   ├── auth/                    # Authentication
│   │   ├── client.ts           # Client-side Supabase client
│   │   └── server.ts           # Server-side helpers
│   ├── providers/               # Provider abstractions
│   │   ├── call-provider.ts    # Call provider interface
│   │   ├── factory.ts          # Provider factory
│   │   └── implementations/    # Provider implementations
│   ├── queue/                   # Queue client
│   │   └── client.ts           # Bull queue client
│   ├── lipsync.ts               # Lip-sync phoneme mapping
│   ├── speech.ts                # TTS speech service
│   └── utils.ts                 # Utility functions
│
├── public/                       # Static assets
│   ├── logo.png
│   └── ...
│
├── middleware.ts                 # Auth middleware
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## Development

### Prerequisites

- Node.js 18+ or 20+
- npm 9+
- Redis (for queue, optional in dev)
- Supabase account

### Environment Variables

Create `web/.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Self-hosting flag
NEXT_PUBLIC_SELF_HOSTED=true

# Call Provider (CallKaro or Vapi)
CALL_PROVIDER=callkaro
CALLKARO_API_KEY=your_api_key
CALLKARO_BASE_URL=https://api.callkaro.ai
CALLKARO_AGENT_ID=your_agent_id

# Payment Provider (DodoPayments)
DODOPAYMENTS_SECRET_KEY=your_secret_key
DODOPAYMENTS_WEBHOOK_SECRET=your_webhook_secret

# Redis (for queue)
REDIS_URL=redis://localhost:6379

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See [docs/SETUP.md](../docs/SETUP.md) for full setup guide.

### Running Locally

```bash
# Install dependencies (from monorepo root)
npm install

# Start development server
npm run dev

# Development server runs on http://localhost:3000
```

### Building

```bash
# Type check
npm run typecheck

# Build for production
npm run build

# Start production server
npm start
```

## Key Features

### Authentication

- Passwordless magic link authentication via Supabase Auth
- Session management with HTTP-only cookies
- Server-side session validation in middleware
- Row-level security (RLS) policies

**Implementation:**
- Client auth: `lib/auth/client.ts`
- Server auth: `lib/auth/server.ts`
- Callback: `app/auth/callback/route.ts`
- Middleware: `middleware.ts`

### Dashboard

The main dashboard interface with:

- **3D Avatar**: Ready Player Me avatar with lip-sync animation
- **HUD**: Stats display (WRS, streak, points)
- **Dock**: Quest log, call button, artifacts, point allocation
- **Starfield**: Three.js starfield background with fog effects

**Implementation:** `app/dashboard/page.tsx` and `app/dashboard/_components/DashboardClient.tsx`

### Voice Calls

Daily reflection calls via phone:

- Provider abstraction layer (CallKaro, Vapi)
- Call initiation API
- Webhook handling for call status
- Transcript storage

**Implementation:**
- API: `app/api/calls/initiate/route.ts`
- Providers: `lib/providers/`
- Webhooks: `app/api/webhooks/call/route.ts`

See [docs/PROVIDERS.md](../docs/PROVIDERS.md) for provider details.

### 3D Avatar & Lip-Sync

- Ready Player Me GLB models
- Visage lightweight viewer
- Browser TTS with phoneme mapping
- 15 OVR LipSync visemes

**Implementation:**
- Lip-sync: `lib/lipsync.ts`
- Speech: `lib/speech.ts`
- Integration: `app/dashboard/page.tsx`

See [docs/VISAGE_INTEGRATION.md](../docs/VISAGE_INTEGRATION.md) and [docs/LIPSYNC_ROADMAP.md](../docs/LIPSYNC_ROADMAP.md).

### Subscriptions

DodoPayments integration for subscription management:

- Checkout flow
- Webhook handling
- Access control via `requireSubscription()`

**Implementation:**
- Checkout: `app/api/create-checkout/route.ts`
- Webhooks: `app/api/webhooks/dodopayment/route.ts`
- Auth: `lib/auth/server.ts`

## API Routes

### Public Routes

- `POST /api/auth/provision` - Create user record (legacy)

### Protected Routes (require auth)

- `POST /api/calls/initiate` - Initiate phone call
- `POST /api/create-checkout` - Create payment checkout

### Webhook Routes

- `POST /api/webhooks/call` - Call status updates
- `POST /api/webhooks/dodopayment` - Payment updates

### Admin Routes

- `GET /api/admin/queues` - Bull queue dashboard

## Styling

- **Framework**: Tailwind CSS
- **Theme**: Dark mode (`#0b0f17` background)
- **Components**: Shadcn/ui primitives
- **Glass morphism**: `bg-white/5 border-white/10 backdrop-blur`
- **Colors**:
  - Primary: Violet/Purple (`#a855f7`)
  - Accents: Cyan, Emerald, Amber, Orange
  - Text: White with opacity variants

## State Management

- **React hooks**: `useState`, `useEffect`, `useCallback`
- **Framer Motion**: Animation state
- **No global state**: Each page manages its own state
- **Server state**: Fetched via Supabase client

## Middleware

Auth middleware protects routes:

```typescript
// middleware.ts
export const config = {
  matcher: ['/dashboard/:path*', '/settings', '/onboarding'],
}
```

**Flow:**
1. Check for session cookie
2. Validate session with Supabase
3. Redirect to `/signup` if unauthenticated
4. Allow request if authenticated

## Testing

### Manual Testing

1. Sign up with magic link
2. Complete onboarding (profile)
3. Subscribe via pricing page
4. Access dashboard
5. Test call initiation
6. Verify webhook handling

### Type Checking

```bash
npm run typecheck
```

### Build Verification

```bash
npm run build
```

## Deployment

### Docker

```bash
# Build production image
docker build -t relevel-web .

# Run container
docker run -p 3000:3000 --env-file .env relevel-web
```

### Docker Compose

See [docker-compose.yml](../docker-compose.yml) in root.

## Performance Considerations

### Optimizations

- **Client components**: Only when interactivity needed
- **Server components**: Default for static content
- **Dynamic imports**: Heavy 3D components lazy loaded
- **Image optimization**: Next.js `<Image>` component
- **Font optimization**: Next.js font system

### Known Issues

- Avatar loads after component mount (flash of default)
- Lip-sync has 10-30ms lag with browser TTS
- Three.js rendering can impact performance on low-end devices

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](../LICENSE) in root.

---

**Part of relevel.me monorepo** - See [root README](../README.md) for full project overview.
