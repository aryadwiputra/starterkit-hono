import pino from 'pino'
import { randomUUID } from 'crypto'

/**
 * Logger Configuration
 *
 * Development: Pretty print output (human-readable)
 * Production: JSON format (structured, parseable)
 */

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Pretty print for development
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Base fields untuk semua log
  base: {
    service: 'starterkit-hono',
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
})

/**
 * Create child logger dengan preset context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Generate correlation ID untuk request tracing
 */
export function generateCorrelationId(): string {
  return process.env.CORRELATION_ID_HEADER?.toLowerCase() === 'x-request-id'
    ? randomUUID()
    : `req-${randomUUID().slice(0, 8)}`
}

/**
 * Log HTTP request dengan structured data
 */
export function logRequest(data: {
  method: string
  path: string
  status?: number
  duration?: number
  correlationId: string
  userAgent?: string
  ip?: string
  error?: Error
}) {
  if (data.error) {
    logger.error({
      ...data,
      type: 'request',
      error: {
        message: data.error.message,
        stack: data.error.stack,
        name: data.error.name,
      },
    })
  } else if (data.status && data.status >= 400) {
    logger.warn({
      ...data,
      type: 'request',
    })
  } else {
    logger.info({
      ...data,
      type: 'request',
    })
  }
}

/**
 * Log application startup
 */
export function logStartup(data: { port: number; env: string }) {
  logger.info({
    ...data,
    type: 'startup',
    message: `Server started on port ${data.port}`,
  })
}

/**
 * Log graceful shutdown
 */
export function logShutdown(signal: string, duration: number) {
  logger.info({
    type: 'shutdown',
    signal,
    duration_ms: duration,
    message: `Server shutdown complete`,
  })
}

/**
 * Log database operations
 */
export function logDb(operation: 'connect' | 'query' | 'error', data?: Record<string, unknown>) {
  logger.debug({
    type: 'database',
    operation,
    ...data,
  })
}
