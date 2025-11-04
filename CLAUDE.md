# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**relevel.me** is a gamified skill-tracking dashboard built with Next.js 14. It provides voice-first journaling with an AI assistant and visualizes learning progress through an immersive interface.

The project features:
- Three.js starfield background and 3D avatar companion
- Quest dock with HUD stats (WRS, streak, points)
- Voice call integration for daily reflections
- Supabase authentication and database
- Background worker for scheduled calls

## Development Commands

```bash
# Install dependencies
npm i

# Run development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Architecture

### Monorepo Structure

This project follows a monorepo structure with npm workspaces:

- **`web/`** — Next.js web application
- **`worker/`** — Background job processor (Bull queues)
- **`packages/shared/`** — Shared utilities and services used by both web and worker

### Next.js App Router Structure (web/)

- **`web/app/page.tsx`** — Landing page with "Enter World" button
- **`web/app/dashboard/page.tsx`** — Main dashboard with 3D avatar and quest dock
- **`web/app/layout.tsx`** — Root layout with metadata
- **`web/app/globals.css`** — Dark theme base styles (`#0b0f17` background)

### Component Organization

The dashboard page contains the main interactive components in `web/app/dashboard/_components/DashboardClient.tsx`:

- **HUD** — Top bar with WRS, streak, points badges
- **3D Avatar** — Ready Player Me avatar with lip-sync animation
- **Dock** — Toggleable sidebar with Quest Log, Evening Call, Artifacts, Allocate Points cards
- **Three.js Scene** — Starfield background with fog effects

UI primitives in `web/components/ui/` (badge, button, card, progress, slider, tabs) are minimal shadcn-style components with Tailwind styling.

### Key Data Structures

Dashboard data is fetched from Supabase via server actions in `web/app/dashboard/actions.ts`:

- **User Profile** - Avatar URL, preferences, subscription status
- **Skills** - Learning goals and skill tracking
- **Checkpoints** - Scheduled reviews and quest items
- **Artifacts** - Active power-ups with effects
- **Calls** - Voice call history and transcripts

The dashboard client uses simplified mock data for Quest Log display.

### Visual Effects

- **Three.js Scene** (`@react-three/fiber`, `@react-three/drei`):
  - Starfield background (`<Stars>` component)
  - Fog effect from z=10 to z=40
  - Float animation wrapper for subtle movement

- **3D Avatar**: Ready Player Me GLB models with lip-sync animation using browser TTS and phoneme mapping

### Path Aliases

TypeScript configured with `@/*` mapping to web directory root (see `web/tsconfig.json` baseUrl/paths).

## Lore

The project features an isekai-inspired mystical aesthetic that frames learning and skill development as an immersive journey.

## Styling Approach

- TailwindCSS for all styling (no CSS modules)
- Dark theme enforced via globals.css (`:root { color-scheme: dark }`)
- Inline `style` props used for dynamic positioning and transforms
- Color palette: violet/purple (`#a855f7`), slate (`#0b0f17`), cyan, emerald, amber, orange
- Glass morphism: `bg-white/5 border-white/10 backdrop-blur`

## Data Flow Patterns

- **Authentication**: Supabase Auth with magic link email flow
- **Database**: PostgreSQL via Supabase with row-level security (RLS)
- **Server Actions**: Next.js server actions in `actions.ts` files for data fetching
- **API Routes**: `/api/calls/initiate` for call initiation, webhooks for call status updates
- **Background Jobs**: Bull queue with Redis for scheduled daily calls (worker process)

## Key Architecture Patterns

- **Monorepo**: npm workspaces with web, worker, and shared packages
- **Provider Pattern**: Pluggable call providers (CallKaro, Vapi) via factory pattern
- **Server/Client Split**: Server components for data fetching, client components for interactivity
- **Background Jobs**: Bull queue for scheduled tasks (daily calls, reminders)
- **Row-Level Security**: Supabase RLS policies enforce data access control
