import { Context, Next } from 'hono'

/**
 * RBAC MIDDLEWARE
 * Penjelasan: Role-Based Access Control
 * Cek apakah user punya role yang diizinkan
 *
 * Usage:
 * app.delete('/users/:id', authMiddleware, requireRole('admin'), handler)
 * app.post('/articles', authMiddleware, requireRole('editor', 'admin'), handler)
 */
export const requireRole = (...allowedRoles: ('user' | 'admin')[]) => {
  return async (c: Context, next: Next) => {
    // Step 1: Ambil user dari context (di-set oleh authMiddleware)
    const user = c.get('user')

    if (!user) {
      // Seharusnya tidak terjadi karena authMiddleware sudah jalan duluan
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Step 2: Check apakah role user termasuk allowedRoles
    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { error: 'Forbidden - Anda tidak punya akses ke resource ini' },
        403
      )
    }

    await next()
  }
}

/**
 * REQUIRE OWNER OR ADMIN
 * Penjelasan: User harus owner (milik sendiri)
 *           ATAU admin untuk akses resource
 *
 * Usage:
 * app.patch('/articles/:id', authMiddleware, requireOwnerOrAdmin(), handler)
 */
export const requireOwnerOrAdmin = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Jika admin, langsung boleh
    if (user.role === 'admin') {
      return await next()
    }

    // Cek apakah user adalah owner
    const ownerId = c.get('ownerId')
    if (ownerId && user.id !== ownerId) {
      return c.json({ error: 'Forbidden - Bukan owner' }, 403)
    }

    await next()
  }
}

/**
 * ALLOW SELF OR ADMIN
 * Penjelasan: User boleh akses resource sendiri
 *           ATAU admin boleh akses siapa saja
 *
 * Usage:
 * app.delete('/users/:id', authMiddleware, allowSelfOrAdmin(), handler)
 */
export const allowSelfOrAdmin = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Admin boleh akses semua
    if (user.role === 'admin') {
      return await next()
    }

    // Get ID dari param route, compare dengan user.id
    const resourceUserId = Number(c.req.param('id'))

    if (resourceUserId && user.id !== resourceUserId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    await next()
  }
}
