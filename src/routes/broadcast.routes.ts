import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { requirePermission } from '../middleware/rbac.middleware'
import { queueBroadcast } from '../lib/queue'

const broadcast = new Hono()

/**
 * Broadcast schema
 */
const broadcastSchema = z.object({
  userIds: z.union([
    z.array(z.number()),
    z.literal('all'),
  ]).describe('Array of user IDs or "all" for all users'),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
})

/**
 * POST /admin/broadcast
 * Send broadcast to users (admin only)
 */
broadcast.post(
  '/',
  authMiddleware,
  requirePermission('broadcast:send'),
  zValidator('json', broadcastSchema),
  async (c) => {
    const body = c.req.valid('json')

    // Queue broadcast job
    const jobId = await queueBroadcast({
      userIds: body.userIds,
      subject: body.subject,
      body: body.body,
    })

    if (!jobId) {
      return c.json({
        error: 'Queue service unavailable. Please check Redis configuration.',
      }, 503)
    }

    return c.json({
      message: 'Broadcast queued successfully',
      jobId,
    }, 202)
  }
)

export default broadcast
