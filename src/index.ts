import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { publicAuth, protectedAuth } from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import healthRoutes from './routes/health.routes'
import auditRoutes from './routes/audit.routes'
import uploadRoutes from './routes/upload.routes'
import broadcastRoutes from './routes/broadcast.routes'
import { authMiddleware, errorHandler, requestIdMiddleware, requestLogger } from './middleware'
import { env } from './lib/env'
import { logger, logStartup } from './lib/logger'
import { setupGracefulShutdown, registerCleanup } from './lib/shutdown'
import { db, dbHealthCheck } from './db'
import { openapi } from './docs/openapi'

const app = new Hono()

// Request ID (must be first)
app.use('*', requestIdMiddleware)

// Request logging
app.use('*', requestLogger)

// CORS - configurable allowed origins
const allowedOrigins = env.CORS_ORIGIN?.split(',').map(s => s.trim()) ?? ['http://localhost:3000']
app.use('*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Error handler
app.onError(errorHandler)

// Not found handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Health check routes
app.route('/health', healthRoutes)

// OpenAPI docs
app.route('/', openapi)

// Public auth routes (register, login)
app.route('/auth', publicAuth)

// Protected auth routes (logout, logout-all, me)
app.route('/auth', protectedAuth)

// Protected API routes
app.use('/api/*', authMiddleware)
app.route('/api/users', userRoutes)

// Audit routes (admin only)
app.route('/audit', auditRoutes)

// Upload routes
app.route('/upload', uploadRoutes)

// Broadcast routes (admin only)
app.route('/admin', broadcastRoutes)

// Register cleanup for database connection
registerCleanup(async () => {
  logger.info({ type: 'cleanup', message: 'Closing database connection...' })
  // bun:sqlite doesn't need explicit close, but good practice
})

// Register cleanup for Redis/queues
registerCleanup(async () => {
  const { closeQueues } = await import('./lib/queue')
  const { closeRedis } = await import('./lib/redis')
  await closeQueues()
  await closeRedis()
})

// Setup graceful shutdown
setupGracefulShutdown({ timeout: 10000 })

// Start server
const port = env.PORT

logger.info({
  type: 'startup',
  port,
  env: env.NODE_ENV,
  message: `Starting server on port ${port}`,
})

export default {
  port,
  fetch: app.fetch,
}

// Log startup (using exported function)
logStartup({ port, env: env.NODE_ENV })
