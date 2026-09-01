# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json ./
COPY bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bun

# Copy built files
COPY --from=builder --chown=bun:nodejs /app/dist ./dist
COPY --from=builder --chown=bun:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bun:nodejs /app/package.json ./

# Create data directory
RUN mkdir -p /app/data && chown bun:nodejs /app/data

USER bun

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "run", "dist/index.js"]
