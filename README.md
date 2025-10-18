
# relevel-openworld (local demo)

An open‑world dashboard for **relevel.me — Artha** with 2D/3D animation:
- Three.js starfield background via `@react-three/fiber` + `drei`
- Pannable / zoomable world map, fog‑of‑war, biomes, skill shrines
- Quest dock, minimap, HUD
- Static mock data (no auth required)

## Run locally
```bash
npm i
npm run dev
# open http://localhost:3000 and click "Enter World"
```

## Stack
- Next.js 14 (app router), React 18
- TailwindCSS (minimal primitives in `components/ui`)
- Framer Motion
- Three.js, @react-three/fiber, @react-three/drei
- Lucide icons

## Edit
- `app/dashboard/page.tsx` — main worldboard
- Shrine positions: `SHRINES`
- Mock data: `SKILLS`, `USER_SKILLS`, `CHECKPOINTS`, `ARTIFACTS`
