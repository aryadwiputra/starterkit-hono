import { Context, Next } from 'hono'
import { logger, logRequest, generateCorrelationId } from '../lib/logger'

/**
 * REQUEST LOGGING MIDDLEWARE
 *
 * Log method, path, status, dan durasi request.
 * Gunakan pino untuk structured logging.
 */

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now()

  // Get or generate correlation ID
  const correlationId = (c.get('requestId') as string) || generateCorrelationId()
  c.set('correlationId', correlationId)

  // Log request masuk
  logRequest({
    method: c.req.method,
    path: c.req.path,
    correlationId,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
  })

  await next()

  const duration = Date.now() - start

  // Log response
  logRequest({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    correlationId,
  })
}
