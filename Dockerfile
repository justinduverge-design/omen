# ════════════════════════════════════════════════════════════════
# Slops Saloon Fantasy Football MVP — Dockerfile
# Multi-stage build: keeps production image slim (~180MB vs ~900MB)
# Stage 1 (builder): installs ALL deps including devDependencies
# Stage 2 (production): copies only what's needed to run
# ════════════════════════════════════════════════════════════════

# ── STAGE 1: Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install build tools needed for native npm packages
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first — Docker layer cache means npm install
# only re-runs when package.json actually changes, not on every build
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps if any)
RUN npm ci --frozen-lockfile

# Copy source code
COPY src/   ./src/
COPY client/ ./client/


# ── STAGE 2: Production ──────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S ssffmvp && adduser -S ssffmvp -G ssffmvp

WORKDIR /app

# Copy only production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --from=builder /app/src    ./src
COPY --from=builder /app/client ./client
COPY package.json ./

# Set NODE_ENV
ENV NODE_ENV=production

# Switch to non-root user
USER ssffmvp

# Expose API port (platform_integration.js)
EXPOSE 3000

# Default command — overridden per service in docker-compose.yml
CMD ["node", "src/server.js"]
