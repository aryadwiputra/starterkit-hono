import { Context, Next } from 'hono'

/**
 * RATE LIMITING MIDDLEWARE
 * Penjelasan: In-memory rate limiter
 *
 * Pattern:
 * - Per-IP limit untuk public routes
 * - Per-user limit untuk authenticated routes
 * - Login attempt protection (max attempts dalam window)
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

// In-memory store (resets on server restart)
// Production: use Redis instead
const store: RateLimitStore = {}

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  }
}, 60_000) // Clean every minute

interface RateLimitOptions {
  windowMs: number    // Time window in ms
  max: number         // Max requests per window
  keyGenerator?: (c: Context) => string  // Custom key generator
}

/**
 * Create rate limit middleware
 * @param options - { windowMs, max, keyGenerator }
 *
 * Usage:
 * rateLimit({ windowMs: 60000, max: 100 }) // 100 req/min per IP
 * rateLimit({ windowMs: 900000, max: 5 })   // 5 req/15min - login protection
 */
export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, keyGenerator } = options

  return async (c: Context, next: Next) => {
    // Default: use IP as key
    const key = keyGenerator
      ? keyGenerator(c)
      : c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown'

    const now = Date.now()
    const windowKey = `${key}:${Math.floor(now / windowMs)}`

    // Initialize or reset if window expired
    if (!store[windowKey] || store[windowKey].resetAt < now) {
      store[windowKey] = {
        count: 0,
        resetAt: now + windowMs,
      }
    }

    // Increment count
    store[windowKey].count++

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - store[windowKey].count)))
    c.header('X-RateLimit-Reset', String(Math.ceil(store[windowKey].resetAt / 1000)))

    // Check if exceeded
    if (store[windowKey].count > max) {
      const retryAfter = Math.ceil((store[windowKey].resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        },
        429
      )
    }

    await next()
  }
}

/**
 * Login rate limiter - stricter limits for auth endpoints
 * Max 5 attempts per 15 minutes per IP
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
})

/**
 * General API rate limiter - 100 requests per minute per IP
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
})

/**
 * Authenticated rate limiter - 100 requests per minute per user
 */
export const authenticatedRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (c) => {
    const user = c.get('user')
    return user ? `user:${user.id}` : 'unknown'
  },
})
