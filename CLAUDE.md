# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**relevel.me** is a voice-first second brain — an AI memory companion you can call. Built with Next.js 14, it captures your thoughts through natural conversation and transforms them into a structured, searchable memory graph.

The project features:
- Voice-first memory capture through phone calls
- AI-powered transcription and intelligent tagging
- Memory graph where ideas connect by topic, tone, and intent
- Reflective intelligence that surfaces forgotten goals and patterns
- Optional gamification layer (skill trees, XP, quests) for memory visualization
- Three.js starfield background and 3D avatar companion
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

- **`web/app/page.tsx`** — Landing page with "A second brain you can call" tagline
- **`web/app/dashboard/page.tsx`** — Main dashboard with memory visualization and 3D avatar
- **`web/app/vision/page.tsx`** — Vision page explaining voice-first second brain concept
- **`web/app/layout.tsx`** — Root layout with SEO metadata
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
- **Skills** - Memory nodes and knowledge areas (optional gamification)
- **Checkpoints** - Scheduled reflections and memory reviews
- **Artifacts** - Active power-ups with effects (optional gamification)
- **Calls** - Voice call history and transcripts (core memory capture)

The dashboard client visualizes memory as an optional gamified interface with quest logs and skill progression.

### Visual Effects

- **Three.js Scene** (`@react-three/fiber`, `@react-three/drei`):
  - Starfield background (`<Stars>` component)
  - Fog effect from z=10 to z=40
  - Float animation wrapper for subtle movement

- **3D Avatar**: Ready Player Me GLB models with lip-sync animation using browser TTS and phoneme mapping

### Path Aliases

TypeScript configured with `@/*` mapping to web directory root (see `web/tsconfig.json` baseUrl/paths).

## Positioning

**relevel.me** is a voice-first second brain — an AI memory companion you can call. The project features a mystical, clarity-focused aesthetic that frames memory and cognition as connected knowledge networks. Optional gamification visualizes your evolving mind as memory orbs and skill trees.

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
