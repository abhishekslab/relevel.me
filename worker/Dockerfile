# Worker Dockerfile - Lightweight Node.js worker for Bull queue processing
FROM node:20-alpine AS base

# Install dependencies (including shared package)
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json* ./
COPY worker/package.json worker/package-lock.json* ./worker/

# Copy shared package
COPY packages/shared ./packages/shared

# Install all dependencies (workspaces will link shared package)
RUN npm ci --legacy-peer-deps

# Build shared package first
FROM deps AS build-shared
WORKDIR /app/packages/shared
RUN npm run build

# Build worker
FROM base AS builder
WORKDIR /app

# Copy package.json files for workspace structure
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/worker/package.json ./worker/package.json

# Copy node_modules from deps (workspace hoisting means all deps are in root)
COPY --from=deps /app/node_modules ./node_modules

# Copy built shared package
COPY --from=build-shared /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-shared /app/packages/shared/package.json ./packages/shared/

# Copy worker source
COPY worker/tsconfig.json ./worker/
COPY worker/src ./worker/src

# Build worker TypeScript to JavaScript
WORKDIR /app/worker
RUN npm run build

# Production runner - minimal image
FROM base AS runner
WORKDIR /app/worker

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Copy production dependencies (including shared package)
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build-shared /app/packages/shared /app/packages/shared

# Copy built worker application
COPY --from=builder /app/worker/dist ./dist
COPY --from=builder /app/worker/package.json ./

# Set ownership
RUN chown -R worker:nodejs /app

USER worker

CMD ["node", "dist/index.js"]
