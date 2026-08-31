import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { publicAuth, protectedAuth } from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import { authMiddleware, errorHandler } from './middleware'

const app = new Hono()

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Logger
app.use('*', logger())

// Error handler
app.onError(errorHandler)

// Not found handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Public auth routes (register, login)
app.route('/auth', publicAuth)

// Protected auth routes (logout, logout-all, me) - requires auth
app.route('/auth', protectedAuth)

// Protected API routes
app.use('/api/*', authMiddleware)
app.route('/api/users', userRoutes)

export default app
