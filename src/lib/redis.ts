import Redis from 'ioredis'
import { env } from './env'
import { logger } from './logger'

/**
 * Redis Client
 *
 * Connection pool untuk Redis operations
 */

let redis: Redis | null = null

/**
 * Get Redis client instance
 */
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) {
    return null
  }

  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError(err) {
        logger.error({ type: 'redis', error: err.message, message: 'Redis reconnect error' })
        return true
      },
    })

    redis.on('connect', () => {
      logger.info({ type: 'redis', message: 'Connected to Redis' })
    })

    redis.on('error', (err) => {
      logger.error({ type: 'redis', error: err.message })
    })

    redis.on('close', () => {
      logger.warn({ type: 'redis', message: 'Redis connection closed' })
    })
  }

  return redis
}

/**
 * Check Redis connection status
 */
export async function isRedisConnected(): Promise<boolean> {
  const client = getRedis()
  if (!client) return false

  try {
    await client.ping()
    return true
  } catch {
    return false
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
    logger.info({ type: 'redis', message: 'Redis connection closed' })
  }
}
