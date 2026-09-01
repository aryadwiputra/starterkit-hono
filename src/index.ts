import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { publicAuth, protectedAuth } from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import { authMiddleware, errorHandler, requestIdMiddleware, requestLogger } from './middleware'
import { env } from './lib/env'
import { dbHealthCheck } from './db'

const app = new Hono()

// Request ID (must be first)
app.use('*', requestIdMiddleware)

// Request logging
app.use('*', requestLogger)

// CORS - configurable allowed origins
const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) ?? ['http://localhost:3000']
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

// Health check
app.get('/health', (c) => {
  try {
    dbHealthCheck()
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected'
    })
  } catch {
    return c.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: 'disconnected'
    }, 503)
  }
})

// Public auth routes (register, login)
app.route('/auth', publicAuth)

// Protected auth routes (logout, logout-all, me) - requires auth
app.route('/auth', protectedAuth)

// Protected API routes
app.use('/api/*', authMiddleware)
app.route('/api/users', userRoutes)

export default app
