import { sessionRepository, passwordResetRepository } from '../db/index'
import { env } from '../lib/env'

/**
 * JOB CLEANUP SESSION
 * Penjelasan: Hapus expired sessions dan password reset tokens
 *
 * Di production, panggil secara periodik via:
 * - Cron job (Vercel, Railway, Render)
 * - Kubernetes CronJob
 * - setInterval untuk deployment sederhana
 */

let cleanupInterval: Timer | null = null

/**
 * Jalankan cleanup sekali
 */
export async function runCleanup(): Promise<{ sessionsDeleted: number; tokensDeleted: number }> {
  const before = Date.now()

  // Cleanup expired sessions dan tokens
  await sessionRepository.cleanupExpired()
  await passwordResetRepository.cleanupExpired()

  const duration = Date.now() - before

  if (env.NODE_ENV !== 'production') {
    console.log(`🧹 Cleanup selesai dalam ${duration}ms`)
  }

  return { sessionsDeleted: 0, tokensDeleted: 0 }
}

/**
 * Start scheduler cleanup periodik (untuk development/simple deployment)
 * Di production, gunakan cron job yang proper
 */
export function startCleanupScheduler(intervalMs: number = 60 * 60 * 1000): void {
  if (cleanupInterval) {
    console.log('⚠️ Cleanup scheduler sudah berjalan')
    return
  }

  // Jalankan langsung saat start
  runCleanup().catch(console.error)

  // Kemudian jalankan secara periodik
  cleanupInterval = setInterval(() => {
    runCleanup().catch(console.error)
  }, intervalMs)

  console.log(`🧹 Cleanup scheduler started (setiap ${intervalMs / 1000 / 60} menit)`)
}

/**
 * Stop cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('🧹 Cleanup scheduler dihentikan')
  }
}

// Export untuk pemanggilan manual via API endpoint
export const cleanupHandlers = {
  runCleanup,
  startCleanupScheduler,
  stopCleanupScheduler,
}
