
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

## Production Deployment

### Docker Deployment (Recommended)

#### Using Docker Compose

```bash
# Build and run the container
docker-compose up -d --build

# The app will be available on port 3001
# Access at http://localhost:3001
```

#### Using Docker CLI

```bash
# Build the image
docker build -t relevel-me .

# Run the container
docker run -d \
  --name relevel-me \
  --restart unless-stopped \
  -p 3001:3000 \
  relevel-me
```

#### With Caddy Reverse Proxy

Add to your `/etc/caddy/Caddyfile`:

```caddy
relevel.me {
    reverse_proxy localhost:3001
    encode gzip
}
```

Reload Caddy:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

#### Useful Commands

```bash
# View logs
docker logs relevel-me -f

# Restart container
docker-compose restart

# Stop and remove
docker-compose down

# Future deployments
git pull origin main
docker-compose up -d --build
```

#### Environment Variables

If you need to add environment variables, create a `.env.local` file and uncomment the `env_file` section in `docker-compose.yml`.

### Alternative: PM2 Deployment

```bash
# Build the application
npm install
npm run build

# Run with PM2 on custom port
PORT=3001 pm2 start npm --name "relevel-me" -- start

# Save PM2 config
pm2 save
```
