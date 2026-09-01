import { Context, Next } from 'hono'
import { env } from '../lib/env'

/**
 * REQUEST LOGGING MIDDLEWARE
 * Log request method, path, status, and duration
 */
export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now()
  const requestId = c.get('requestId') || 'unknown'

  // Log incoming request
  logRequest('IN', c.req.method, c.req.path, requestId)

  await next()

  const duration = Date.now() - start
  const status = c.res.status

  // Log response
  logResponse('OUT', c.req.method, c.req.path, status, duration, requestId)
}

function logRequest(dir: string, method: string, path: string, requestId: string) {
  if (env.NODE_ENV === 'development') {
    console.log(`[${dir}] ${method} ${path} | ${requestId}`)
  }
}

function logResponse(
  dir: string,
  method: string,
  path: string,
  status: number,
  duration: number,
  requestId: string
) {
  const statusColor = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢'

  if (env.NODE_ENV === 'development') {
    console.log(`${statusColor} [${dir}] ${method} ${path} ${status} ${duration}ms | ${requestId}`)
  } else {
    // JSON format for production
    console.log(
      JSON.stringify({
        type: 'request',
        direction: dir,
        method,
        path,
        status,
        duration,
        requestId,
        timestamp: new Date().toISOString(),
      })
    )
  }
}
