import { sessionRepository, passwordResetRepository } from '../db/index'
import { env } from '../lib/env'

/**
 * SESSION CLEANUP JOB
 * Removes expired sessions and password reset tokens
 *
 * In production, call this periodically via:
 * - Cron job (Vercel, Railway, Render)
 * - Kubernetes CronJob
 * - setInterval for simple deployments
 */

let cleanupInterval: Timer | null = null

/**
 * Run cleanup once
 */
export async function runCleanup(): Promise<{ sessionsDeleted: number; tokensDeleted: number }> {
  const before = Date.now()

  // Get counts before (approximate - we'll just run cleanup)
  await sessionRepository.cleanupExpired()
  await passwordResetRepository.cleanupExpired()

  const duration = Date.now() - before

  if (env.NODE_ENV !== 'production') {
    console.log(`🧹 Cleanup completed in ${duration}ms`)
  }

  return { sessionsDeleted: 0, tokensDeleted: 0 }
}

/**
 * Start periodic cleanup (for development/simple deployments)
 * In production, use proper cron job instead
 */
export function startCleanupScheduler(intervalMs: number = 60 * 60 * 1000): void {
  if (cleanupInterval) {
    console.log('⚠️ Cleanup scheduler already running')
    return
  }

  // Run immediately on start
  runCleanup().catch(console.error)

  // Then run periodically
  cleanupInterval = setInterval(() => {
    runCleanup().catch(console.error)
  }, intervalMs)

  console.log(`🧹 Cleanup scheduler started (every ${intervalMs / 1000 / 60} minutes)`)
}

/**
 * Stop cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('🧹 Cleanup scheduler stopped')
  }
}

// Export for manual triggering via API endpoint
export const cleanupHandlers = {
  runCleanup,
  startCleanupScheduler,
  stopCleanupScheduler,
}
