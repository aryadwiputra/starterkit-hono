import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { auditService } from '../services/audit.service'
import { authMiddleware, requirePermission } from '../middleware'

const audit = new Hono()

/**
 * Query schema for audit logs
 */
const querySchema = z.object({
  userId: z.coerce.number().optional(),
  resource: z.string().optional(),
  action: z.enum(['create', 'update', 'delete']).optional(),
  from: z.coerce.string().optional().transform((val) => val ? new Date(val) : undefined),
  to: z.coerce.string().optional().transform((val) => val ? new Date(val) : undefined),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})

/**
 * GET /audit
 * Get audit logs (admin only)
 * Query: ?userId=1&resource=users&action=create&from=2024-01-01&to=2024-12-31&limit=50&offset=0
 */
audit.get(
  '/',
  authMiddleware,
  requirePermission('users:read'),
  zValidator('query', querySchema),
  async (c) => {
    const query = c.req.valid('query')

    const logs = await auditService.getLogs({
      userId: query.userId,
      resource: query.resource,
      action: query.action,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    })

    const total = await auditService.countLogs({
      userId: query.userId,
      resource: query.resource,
      action: query.action,
      from: query.from,
      to: query.to,
    })

    return c.json({
      data: logs,
      pagination: {
        total,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      },
    })
  }
)

/**
 * GET /audit/:id
 * Get single audit log (admin only)
 */
audit.get(
  '/:id',
  authMiddleware,
  requirePermission('users:read'),
  zValidator('param', z.object({ id: z.coerce.number() })),
  async (c) => {
    const { id } = c.req.valid('param')

    const log = await auditService.getLogById(id)

    if (!log) {
      return c.json({ error: 'Audit log not found' }, 404)
    }

    return c.json({ data: log })
  }
)

/**
 * GET /audit/resource/:resource/:resourceId
 * Get history untuk resource tertentu
 */
audit.get(
  '/resource/:resource/:resourceId',
  authMiddleware,
  requirePermission('users:read'),
  zValidator('param', z.object({
    resource: z.string(),
    resourceId: z.string(),
  })),
  async (c) => {
    const { resource, resourceId } = c.req.valid('param')

    const logs = await auditService.getResourceHistory(resource, resourceId)

    return c.json({ data: logs })
  }
)

export default audit
