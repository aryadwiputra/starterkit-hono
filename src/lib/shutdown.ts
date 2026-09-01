import { logger } from './logger'

/**
 * Graceful Shutdown Handler
 *
 * Handle SIGTERM, SIGINT untuk cleanup resources
 * sebelum process exit.
 */

type CleanupFn = () => Promise<void> | void

const cleanupFunctions: CleanupFn[] = []
let isShuttingDown = false
const startupTime = Date.now()

/**
 * Register cleanup function untuk dipanggil saat shutdown
 */
export function registerCleanup(fn: CleanupFn): void {
  cleanupFunctions.push(fn)
}

/**
 * Get server uptime dalam milliseconds
 */
export function getUptime(): number {
  return Date.now() - startupTime
}

/**
 * Execute semua cleanup functions
 */
async function executeCleanup(): Promise<void> {
  logger.info({
    type: 'shutdown',
    cleanup_count: cleanupFunctions.length,
    message: 'Executing cleanup functions...',
  })

  for (const fn of cleanupFunctions) {
    try {
      await fn()
    } catch (error) {
      logger.error({
        type: 'shutdown',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Cleanup function failed',
      })
    }
  }
}

/**
 * Force exit setelah timeout
 */
function forceExit(): void {
  logger.warn({
    type: 'shutdown',
    message: 'Forcing exit due to timeout',
  })
  process.exit(1)
}

/**
 * Handle shutdown signal
 */
async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.debug({ signal, type: 'shutdown', message: 'Shutdown already in progress' })
    return
  }

  isShuttingDown = true
  const startTime = Date.now()

  logger.info({
    type: 'shutdown',
    signal,
    message: `Received ${signal}, starting graceful shutdown...`,
  })

  try {
    // Execute cleanup
    await executeCleanup()

    const duration = Date.now() - startTime
    logger.info({
      type: 'shutdown',
      signal,
      duration_ms: duration,
      uptime_ms: getUptime(),
      message: 'Graceful shutdown complete',
    })
  } catch (error) {
    logger.error({
      type: 'shutdown',
      signal,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Shutdown error',
    })
    forceExit()
  }
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(options: { timeout?: number } = {}): void {
  const timeout = options.timeout ?? 10000 // Default 10 seconds

  // Register signal handlers
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
  process.on('SIGINT', () => handleShutdown('SIGINT'))

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal({
      type: 'shutdown',
      error: error.message,
      stack: error.stack,
      message: 'Uncaught exception - exiting',
    })
    forceExit()
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.fatal({
      type: 'shutdown',
      reason: String(reason),
      message: 'Unhandled promise rejection - exiting',
    })
    forceExit()
  })

  // Set timeout untuk force exit
  setTimeout(() => {
    if (isShuttingDown) {
      forceExit()
    }
  }, timeout)

  logger.info({
    type: 'startup',
    message: `Graceful shutdown handler registered (timeout: ${timeout}ms)`,
  })
}
