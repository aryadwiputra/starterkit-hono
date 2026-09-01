import { Context, Next } from 'hono'

/**
 * REQUEST ID MIDDLEWARE
 * Generate unique ID per request for tracing
 */
export const requestIdMiddleware = async (c: Context, next: Next) => {
  // Check if request ID exists in header, otherwise generate new one
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID()

  // Attach to context
  c.set('requestId', requestId)

  // Add to response header
  c.res.headers.set('X-Request-ID', requestId)

  await next()
}
