# ──────────────────────────────────────────────────────────────
# Dockerfile — Arabic Property Extractor
# Multi-stage build: keeps the final image small and secure.
# ──────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ─────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Copy manifest only (maximises Docker layer cache)
COPY package.json ./

# Install production deps only
RUN npm install --omit=dev


# ── Stage 2: runtime image ─────────────────────────────────────
FROM node:18-alpine AS runtime

LABEL description="Arabic Property Extractor REST API"

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Pull in installed modules from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Hand ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Docker health check — marks container unhealthy if /health fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
