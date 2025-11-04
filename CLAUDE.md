# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**relevel.me** is an open-world gamified skill-tracking dashboard built with Next.js 14. It presents a 2D/3D interactive worldboard where users can explore skill shrines, manage checkpoints, and visualize their learning progress through an isekai-inspired interface.

The project uses static mock data (no backend/auth) and features:
- Pannable/zoomable world map with biome regions
- Fog-of-war system that reveals as skills are discovered
- Three.js starfield background
- Quest dock, minimap, HUD with stats (WRS, streak, points)
- Skill shrines positioned across different biomes (meadow, forest, desert, mist, tech, peaks)

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
- **`web/app/dashboard/page.tsx`** — Main worldboard interface (10kb+ file containing all game logic)
- **`web/app/layout.tsx`** — Root layout with metadata
- **`web/app/globals.css`** — Dark theme base styles (`#0b0f17` background)

### Component Organization

The dashboard page is monolithic by design - all game components are defined in a single file (`web/app/dashboard/page.tsx`):

- **HUD** — Top bar with WRS, streak, points badges, and zoom slider
- **WorldDecor** — Grid background overlay
- **BiomeRegions** — SVG-rendered colored zones for different skill categories
- **FogOfWar** — CSS mask-based visibility system using radial gradients
- **Shrines** — Interactive skill nodes positioned via `SHRINES` constant
- **PlayerMarker** — Cyan pulsing indicator at player position
- **Dock** — Right sidebar with Quest Log, Evening Call, Artifacts, Allocate Points cards
- **MiniMap** — Bottom-left viewport indicator

UI primitives in `web/components/ui/` (badge, button, card, progress, slider, tabs) are minimal shadcn-style components with Tailwind styling.

### Key Data Structures

All mock data is defined at the top of `web/app/dashboard/page.tsx`:

```typescript
const SKILLS: Skill[]           // Master skill list (id, code, name, category)
const SHRINES: Record<UUID, {x, y, biome}>  // Shrine positions on 2800x1600 world
const USER_SKILLS: UserSkill[]  // Player progress (level, xp, discovered, due_at)
const CHECKPOINTS: Checkpoint[] // Due quests/reviews
const ARTIFACTS: Artifact[]     // Active power-ups with effects
```

Types: `Skill`, `UserSkill`, `Checkpoint`, `Artifact`, `Biome`, `UUID`

### Camera & Interaction System

- **Panning**: Framer Motion's `drag` + `useMotionValue` for `camX`/`camY`
- **Zoom**: State-controlled `zoom` (0.6-2.2) applied via CSS `scale`
- **Keyboard**: WASD/arrow keys move camera (step adjusted by zoom)
- **Mouse wheel**: Ctrl+wheel or large deltaY triggers zoom

Camera offset centers the world at startup: `-(WORLD_W/2 - 600)`, `-(WORLD_H/2 - 350)`

### Visual Effects

- **Three.js Scene** (`@react-three/fiber`, `@react-three/drei`):
  - Starfield background (`<Stars>` component)
  - Fog effect from z=10 to z=40
  - Float animation wrapper for subtle movement

- **Fog-of-War**: Dynamically generated CSS `mask-image` with radial gradients centered on revealed shrines + player position

- **Shrine Glow**: Discovered shrines have `shadow-[0_0_24px_8px_rgba(168,85,247,0.35)]` and conic gradient rotation on hover

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

All data is currently static mock data with no API calls:
- `addMinsISO(m)` helper generates future timestamps for due dates
- `xpToNextPct(level, xp)` calculates progress to next level using power function
- No persistence layer - refreshing resets all state

## Future Extension Points

To add real backend integration:
1. Replace mock constants with API fetch calls (likely in a `useEffect` or RSC data fetch)
2. Add user authentication (currently hardcoded `user_id: 'u1'`)
3. Wire up "Start", "Call now", "Assign" buttons to actual actions
4. Implement skill unlock/discovery logic based on XP thresholds
5. Add checkpoint completion flow with item review interface
