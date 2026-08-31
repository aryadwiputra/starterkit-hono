import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { userService } from '../services/user.service'
import { authMiddleware, requireRole } from '../middleware'

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
 * Header: Authorization: Bearer <sessionId>
 * Query: ?limit=10&offset=0
 */
user.get(
  '/',
  authMiddleware,
  requireRole('admin'),
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
 * Header: Authorization: Bearer <sessionId>
 * Access: User sendiri ATAU admin
 */
user.get(
  '/:id',
  authMiddleware,
  async (c, next) => {
    const requester = c.get('user')
    const targetId = Number(c.req.param('id'))

    // RBAC: User hanya bisa lihat dirinya sendiri
    if (requester.role !== 'admin' && requester.id !== targetId) {
      return c.json({ error: 'Tidak punya akses' }, 403)
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
 * Header: Authorization: Bearer <sessionId>
 * Access: User sendiri ATAU admin
 * Body: { name?, email? }
 */
user.patch(
  '/:id',
  authMiddleware,
  zValidator('json', updateProfileSchema),
  async (c, next) => {
    const requester = c.get('user')
    const targetId = Number(c.req.param('id'))

    // RBAC check
    if (requester.role !== 'admin' && requester.id !== targetId) {
      return c.json({ error: 'Tidak punya akses' }, 403)
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
 * Penjelasan: Delete user (admin only)
 * Header: Authorization: Bearer <sessionId>
 * Access: Admin only (tidak bisa hapus diri sendiri)
 */
user.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const targetId = Number(c.req.param('id'))
    const requester = c.get('user')

    await userService.deleteUser(targetId, requester)

    return c.json({ message: 'User berhasil dihapus' })
  }
)

/**
 * ROUTE: PATCH /users/:id/role
 * Penjelasan: Change user role (admin only)
 * Header: Authorization: Bearer <sessionId>
 * Access: Admin only
 * Body: { role: 'user' | 'admin' }
 */
user.patch(
  '/:id/role',
  authMiddleware,
  requireRole('admin'),
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
