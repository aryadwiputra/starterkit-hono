import { Context, Next } from 'hono'
import { hasPermission, hasRole, getUserPermissions } from '../lib/rbac'

/**
 * REQUIRE PERMISSION
 * Penjelasan: Cek apakah user punya permission tertentu
 *
 * Usage:
 * app.delete('/users/:id', authMiddleware, requirePermission('users:delete'), handler)
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Admin punya semua permissions
    const isAdmin = await hasRole(user.id, 'admin')
    if (isAdmin) {
      return await next()
    }

    // Check setiap required permission
    for (const perm of requiredPermissions) {
      const hasPerm = await hasPermission(user.id, perm)
      if (!hasPerm) {
        return c.json(
          { error: `Forbidden - Permission '${perm}' diperlukan` },
          403
        )
      }
    }

    await next()
  }
}

/**
 * REQUIRE ROLE
 * Penjelasan: Cek apakah user punya role tertentu
 *
 * Usage:
 * app.delete('/users/:id', authMiddleware, requireRole('admin'), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Admin boleh semua
    if (allowedRoles.includes('admin')) {
      const isAdmin = await hasRole(user.id, 'admin')
      if (isAdmin) {
        return await next()
      }
    }

    for (const role of allowedRoles) {
      const hasTheRole = await hasRole(user.id, role)
      if (hasTheRole) {
        return await next()
      }
    }

    return c.json(
      { error: 'Forbidden - Role tidak diizinkan' },
      403
    )
  }
}

/**
 * REQUIRE OWNER OR PERMISSION
 * Penjelasan: User harus owner (milik sendiri)
 *           ATAU punya permission tertentu
 *
 * Usage:
 * app.patch('/posts/:id', authMiddleware, requireOwnerOrPermission('posts:update'), handler)
 */
export const requireOwnerOrPermission = (permission: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Admin boleh semua
    const isAdmin = await hasRole(user.id, 'admin')
    if (isAdmin) {
      return await next()
    }

    // Cek permission
    const hasPerm = await hasPermission(user.id, permission)
    if (hasPerm) {
      return await next()
    }

    return c.json({ error: 'Forbidden' }, 403)
  }
}

/**
 * ALLOW SELF OR PERMISSION
 * Penjelasan: User boleh akses resource sendiri
 *           ATAU punya permission tertentu
 *
 * Usage:
 * app.patch('/users/:id', authMiddleware, allowSelfOrPermission('users:update'), handler)
 */
export const allowSelfOrPermission = (permission: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Admin boleh semua
    const isAdmin = await hasRole(user.id, 'admin')
    if (isAdmin) {
      return await next()
    }

    // Get ID dari param route
    const resourceUserId = Number(c.req.param('id'))

    // Jika owner dari resource, boleh
    if (resourceUserId && user.id === resourceUserId) {
      return await next()
    }

    // Cek permission
    const hasPerm = await hasPermission(user.id, permission)
    if (hasPerm) {
      return await next()
    }

    return c.json({ error: 'Forbidden' }, 403)
  }
}

/**
 * CHECK PERMISSION (set to context)
 * Penjelasan: Set user permissions ke context
 *            Tanpa block request
 *
 * Usage:
 * app.use('/*', authMiddleware, setUserPermissions)
 */
export const setUserPermissions = async (c: Context, next: Next) => {
  const user = c.get('user')
  if (user) {
    const permissions = await getUserPermissions(user.id)
    c.set('permissions', permissions)
  }
  await next()
}
