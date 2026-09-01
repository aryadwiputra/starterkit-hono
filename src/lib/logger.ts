import pino from 'pino'
import { randomUUID } from 'crypto'
import { mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'

/**
 * Logger Configuration
 *
 * Development: Pretty print output (human-readable)
 * Production: JSON format + file with daily rotation
 */

const isDev = process.env.NODE_ENV !== 'production'
const logDir = process.env.LOG_DIR || 'logs'

/**
 * Format date untuk filename
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Get log file path untuk hari ini
 */
function getLogFilePath(): string {
  const filename = `app-${formatDate(new Date())}.log`
  return join(logDir, filename)
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
}

/**
 * Delete old log files (> 7 days)
 */
function cleanupOldLogs(): void {
  if (!existsSync(logDir)) return

  const files = readdirSync(logDir)
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago

  for (const file of files) {
    if (!file.startsWith('app-') || !file.endsWith('.log')) continue

    const filepath = join(logDir, file)
    const stat = Bun.file(filepath)
    if (stat && stat.lastModified && stat.lastModified < cutoff) {
      try {
        unlinkSync(filepath)
        console.log(`🗑️ Deleted old log: ${file}`)
      } catch {
        // Ignore errors
      }
    }
  }
}

// Ensure log directory exists
ensureLogDir()

// Cleanup old logs on startup
cleanupOldLogs()

// Create pino instance
const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'starterkit-hono',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}

// Add file transport for production
if (!isDev) {
  // pino.file is built-in for writing to file
  ;(pinoConfig as any).transport = {
    targets: [
      {
        target: 'pino/file',
        options: { destination: 1 }, // stdout
        level: 'info',
      },
      {
        target: 'pino/file',
        options: { destination: getLogFilePath() },
        level: 'info',
      },
    ],
  }
}

export const logger = pino(pinoConfig)

// For development, use pretty print
if (isDev) {
  logger.level = process.env.LOG_LEVEL || 'info'
}

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
