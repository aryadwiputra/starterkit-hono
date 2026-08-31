import { Context, Next } from 'hono'
import { authService } from '../services/auth.service'

/**
 * AUTH MIDDLEWARE
 * Penjelasan: Verifikasi user sudah login
 * Cara kerja:
 * 1. Ambil session ID dari header Authorization
 * 2. Validate session di database
 * 3. Set user object ke context untuk handler lain pakai
 *
 * Usage:
 * app.get('/profile', authMiddleware, handler)
 */
export const authMiddleware = async (c: Context, next: Next) => {
  // Step 1: Ambil session ID dari header
  // Format: Authorization: Bearer <sessionId>
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Return 401 jika tidak ada token
    return c.json({ error: 'Unauthorized - Token diperlukan' }, 401)
  }

  const sessionId = authHeader.slice(7) // Hapus "Bearer " prefix

  // Step 2: Validate session di database
  const user = await authService.validateSession(sessionId)

  if (!user) {
    return c.json({ error: 'Unauthorized - Token invalid atau expired' }, 401)
  }

  // Step 3: Set user ke context
  // Handler lain bisa akses via c.get('user')
  c.set('user', user)
  c.set('sessionId', sessionId)

  await next()
}

/**
 * OPTIONAL AUTH MIDDLEWARE
 * Penjelasan: Set user ke context jika ada token
 *           Tidak throw error jika tidak ada token
 *           Berguna untuk route yang bisa diakses
 *           authenticated maupun anonymous user
 *
 * Usage:
 * app.get('/articles', optionalAuthMiddleware, handler)
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const sessionId = authHeader.slice(7)
    const user = await authService.validateSession(sessionId)

    if (user) {
      c.set('user', user)
      c.set('sessionId', sessionId)
    }
  }

  await next()
}
