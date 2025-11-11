# Docker Development vs Production Setup

This document explains the key differences between development and production Docker configurations for relevel.me.

## Quick Reference

| Aspect | Development | Production |
|--------|-------------|------------|
| **Dockerfile** | `Dockerfile.dev` | `Dockerfile` |
| **Compose File** | `docker-compose.dev.yml` | `docker-compose.yml` |
| **Service Names** | `web`, `worker` | `web`, `worker` |
| **Container Names** | `relevel-web-dev`, `relevel-worker-dev` | `relevel-web-prod`, `relevel-worker-prod` |
| **Source Mounting** | ✅ Yes (volumes) | ❌ No (copied) |
| **TypeScript** | On-the-fly compilation | Pre-compiled to JavaScript |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Build Step** | `npm run dev` | `npm run build` |
| **Shared Package** | Reads TS source directly | Needs compiled `dist/` folder |
| **Image Size** | Larger (includes build tools) | Smaller (optimized) |
| **Port** | 3000 | 3001 |

## Development Setup

### Dockerfile.dev

```dockerfile
FROM node:20-slim

# Install build tools (python3, make, g++, etc.)
# Required for native modules like ONNX Runtime

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY web/package*.json ./web/
COPY worker/package*.json ./worker/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --verbose

# Copy tsconfig files
COPY tsconfig.json ./
COPY web/tsconfig.json ./web/
COPY packages/shared/tsconfig.json ./packages/shared/

# Start Next.js in development mode
CMD ["npm", "run", "dev"]
```

### docker-compose.dev.yml

```yaml
web:
  build:
    context: .
    dockerfile: Dockerfile.dev
  container_name: relevel-web-dev
  ports:
    - "3000:3000"
  volumes:
    # Mount source code for hot reloading
    - ./web:/app/web
    - ./packages:/app/packages  # <-- TypeScript source mounted
  command: npm run dev
```

### How Dev Works

1. **Source Code Volumes**: Your actual source files are mounted into the container
   - Changes to files are immediately visible inside container
   - No rebuild needed for code changes

2. **TypeScript On-The-Fly**: Next.js dev server compiles TypeScript in memory
   - Can import `.ts` files directly from `packages/shared/src/`
   - No need to build shared package to `dist/`

3. **Hot Reload**: File watcher detects changes and recompiles automatically
   - Fast feedback loop during development

4. **Build Tools Included**: Dev image includes Python, make, g++
   - Required for native modules (ONNX Runtime, sharp, etc.)
   - Larger image size (~800MB) but more compatible

### Why Dev Works Without Building Shared Package

```javascript
// In web/app/api/memory/create/route.ts
import { getEmbeddingProvider } from '@relevel-me/shared'
```

**Dev mode:**
- Next.js resolves to `packages/shared/src/index.ts` (TypeScript source)
- Compiles TypeScript on-the-fly
- No build step needed ✅

## Production Setup

### Dockerfile (Production)

```dockerfile
# Multi-stage build for optimization

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --legacy-peer-deps

# Stage 2: Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build shared package FIRST (TypeScript → JavaScript)
# Then build Next.js app
RUN npm run build  # Runs build:shared && cd web && npm run build

# Stage 3: Production runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy ONLY what's needed (standalone output)
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./web/.next/static
CMD ["node", "web/server.js"]
```

### docker-compose.yml

```yaml
web:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
  container_name: relevel-web-prod
  ports:
    - "3001:3000"  # Different host port to avoid conflicts
  # NO volumes - everything is copied during build
  environment:
    - NODE_ENV=production
```

### How Production Works

1. **Static Build**: All code is compiled during `docker build`
   - TypeScript → JavaScript
   - Next.js optimizations (tree-shaking, minification)
   - Standalone output bundle created

2. **No Volumes**: Source code is copied, not mounted
   - Immutable deployments
   - Code changes require rebuild

3. **Multi-Stage Build**: Separates build and runtime
   - Builder stage has all tools
   - Runner stage is minimal (only runtime deps)
   - Smaller final image (~200MB)

4. **Shared Package Must Be Pre-Built**:
   ```bash
   npm run build:shared  # Compiles packages/shared/src/*.ts → packages/shared/dist/*.js
   cd web && npm run build  # Next.js imports from packages/shared/dist/
   ```

### Why Production Needs Built Shared Package

```javascript
// In web/app/api/memory/create/route.ts
import { getEmbeddingProvider } from '@relevel-me/shared'
```

**Production mode:**
- Resolves via `packages/shared/package.json`: `"main": "dist/index.js"`
- **Requires `dist/index.js` to exist** (compiled JavaScript)
- If `dist/` doesn't exist → `Module not found` error ❌

## Build Scripts

### Root package.json

```json
{
  "scripts": {
    "dev": "cd web && npm run dev",
    "build": "npm run build:shared && cd web && npm run build",
    "build:shared": "cd packages/shared && npm run build",
    "worker:build": "npm run build:shared && cd worker && npm run build"
  }
}
```

**Key points:**
- `npm run dev` - **No shared build** (dev compiles TS on-the-fly)
- `npm run build` - **Builds shared first** (production needs compiled JS)
- `npm run build:shared` - Compiles `packages/shared/src/*.ts → dist/*.js`

## Common Issues

### ❌ "Module not found: Can't resolve '@relevel-me/shared'"

**Cause**: Production build trying to import shared package before it's compiled

**Solution**: Ensure `npm run build` includes `npm run build:shared`:
```json
"build": "npm run build:shared && cd web && npm run build"
```

### ❌ "service has neither an image nor a build context"

**Cause**: Service name mismatch between base and overlay compose files

**Solution**: Use consistent service names (`web`, `worker`) across all compose files

### ❌ Dev works but production fails

**Cause**: Dev uses volume-mounted TypeScript source, production needs compiled JavaScript

**Solution**: Add build step for shared package in production Dockerfile/scripts

## Running the Stack

### Development (with Ollama)
```bash
docker compose -f docker-compose.dev.yml -f docker-compose.ollama.yml up
```

**Features:**
- Hot reload enabled
- TypeScript source mounted
- Port 3000
- Larger images with build tools

### Production (with Ollama)
```bash
docker compose -f docker-compose.yml -f docker-compose.ollama.yml up --build
```

**Features:**
- Optimized builds
- Standalone output
- Port 3001
- Minimal runtime images

## Network Configuration

Both dev and production use `relevel-network` when running with Ollama overlay:

```yaml
# docker-compose.ollama.yml
services:
  redis:
    networks:
      - relevel-network
  web:
    networks:
      - relevel-network
  worker:
    networks:
      - relevel-network
  ollama:
    networks:
      - relevel-network
```

This ensures all services can communicate regardless of environment.

## Migration Notes

### Switching from Old to New Naming

If you have containers running with old names (`relevel-me`, `relevel-worker`):

```bash
# Stop and remove old containers
docker stop relevel-me relevel-worker relevel-redis
docker rm relevel-me relevel-worker relevel-redis

# Start with new naming
docker compose -f docker-compose.yml up --build
```

### Data Persistence

Redis data is stored in named volumes:
- Dev: `redis_data_dev`
- Prod: `redis-data`

These volumes persist even after container removal.

## Summary

**Use Dev when:**
- Actively developing features
- Need fast feedback with hot reload
- Working with TypeScript source
- Debugging with full stack traces

**Use Production when:**
- Deploying to servers
- Need optimal performance
- Want smaller images
- Require immutable deployments

The key architectural difference: **Dev mounts source and compiles on-the-fly, Production pre-compiles everything and runs from static bundles.**
