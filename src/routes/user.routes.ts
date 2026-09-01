import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { userService } from '../services/user.service'
import { authMiddleware } from '../middleware'
import { requirePermission, allowSelfOrPermission } from '../middleware/rbac.middleware'

const user = new Hono()

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
})

const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})

/**
 * ROUTE: GET /users
 * Penjelasan: List semua users (admin only)
 * Permission: users:read
 */
user.get(
  '/',
  authMiddleware,
  requirePermission('users:read'),
  zValidator('query', paginationSchema),
  async (c) => {
    const { limit, offset } = c.req.valid('query')
    const requester = c.get('user')

    const users = await userService.listUsers(requester, { limit, offset })

    return c.json({
      data: users,
      pagination: {
        limit: limit ?? 50,
        offset: offset ?? 0,
      },
    })
  }
)

/**
 * ROUTE: GET /users/:id
 * Penjelasan: Get user profile by ID
 * Permission: users:read (untuk lihat user lain)
 *            users:read:own (untuk lihat diri sendiri)
 */
user.get(
  '/:id',
  authMiddleware,
  async (c, next) => {
    const requester = c.get('user')
    const targetId = Number(c.req.param('id'))

    // Self access - boleh dengan users:read:own
    if (requester.id === targetId) {
      // Check permission untuk own
      const { hasPermission } = await import('../lib/rbac')
      const hasOwnPerm = await hasPermission(requester.id, 'users:read:own')
      if (hasOwnPerm) {
        return await next()
      }
    }

    // Admin boleh lihat semua
    const { hasRole } = await import('../lib/rbac')
    const isAdmin = await hasRole(requester.id, 'admin')
    if (isAdmin) {
      return await next()
    }

    // Other users - butuh users:read
    const hasReadPerm = await hasPermission(requester.id, 'users:read')
    if (!hasReadPerm) {
      return c.json({ error: 'Forbidden - Tidak punya akses' }, 403)
    }

    await next()
  },
  async (c) => {
    const targetId = Number(c.req.param('id'))
    const profile = await userService.getProfile(targetId)

    return c.json({ data: profile })
  }
)

/**
 * ROUTE: PATCH /users/:id
 * Penjelasan: Update user profile
 * Permission: users:update (untuk update user lain)
 *            users:update:own (untuk update diri sendiri)
 */
user.patch(
  '/:id',
  authMiddleware,
  zValidator('json', updateProfileSchema),
  async (c, next) => {
    const requester = c.get('user')
    const targetId = Number(c.req.param('id'))

    // Self update - boleh dengan users:update:own
    if (requester.id === targetId) {
      const { hasPermission } = await import('../lib/rbac')
      const hasOwnPerm = await hasPermission(requester.id, 'users:update:own')
      if (hasOwnPerm) {
        return await next()
      }
    }

    // Admin boleh update semua
    const { hasRole } = await import('../lib/rbac')
    const isAdmin = await hasRole(requester.id, 'admin')
    if (isAdmin) {
      return await next()
    }

    // Other users - butuh users:update
    const hasUpdatePerm = await hasPermission(requester.id, 'users:update')
    if (!hasUpdatePerm) {
      return c.json({ error: 'Forbidden - Tidak punya akses' }, 403)
    }

    await next()
  },
  async (c) => {
    const targetId = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const updatedProfile = await userService.updateProfile(targetId, body)

    return c.json({
      message: 'Profile berhasil diupdate',
      data: updatedProfile,
    })
  }
)

/**
 * ROUTE: DELETE /users/:id
 * Penjelasan: Delete user
 * Permission: users:delete
 */
user.delete(
  '/:id',
  authMiddleware,
  requirePermission('users:delete'),
  async (c) => {
    const targetId = Number(c.req.param('id'))
    const requester = c.get('user')

    await userService.deleteUser(targetId, requester)

    return c.json({ message: 'User berhasil dihapus' })
  }
)

/**
 * ROUTE: PATCH /users/:id/role
 * Penjelasan: Change user role
 * Permission: users:role:update
 */
user.patch(
  '/:id/role',
  authMiddleware,
  requirePermission('users:role:update'),
  zValidator(
    'json',
    z.object({
      role: z.enum(['user', 'admin']),
    })
  ),
  async (c) => {
    const targetId = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const requester = c.get('user')

    const updatedUser = await userService.changeRole(targetId, body.role, requester)

    return c.json({
      message: 'Role berhasil diupdate',
      data: updatedUser,
    })
  }
)

export default user
