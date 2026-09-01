import { Job } from 'bullmq'
import { db } from '../../src/db'
import { users } from '../../src/db/schema'
import { getEmailQueue } from '../../src/lib/queue'
import { logger } from '../../src/lib/logger'
import { QUEUE_NAMES, type BroadcastJob } from '../../shared/jobs'

/**
 * Broadcast Job Processor
 *
 * Process broadcast job:
 * 1. Get target users
 * 2. Queue individual email jobs
 */

const BATCH_SIZE = 50 // Process users in batches

export async function processBroadcastJob(job: Job<BroadcastJob>): Promise<void> {
  const { userIds, subject, body } = job.data

  logger.info({
    type: 'worker',
    jobId: job.id,
    queue: QUEUE_NAMES.BROADCAST,
    target: userIds === 'all' ? 'all users' : `${userIds.length} users`,
  })

  // Get email queue
  const emailQueue = getEmailQueue()

  if (!emailQueue) {
    logger.error({
      type: 'worker',
      jobId: job.id,
      queue: QUEUE_NAMES.BROADCAST,
      error: 'Email queue not available',
    })
    throw new Error('Email queue not available')
  }

  // Get users
  let targetUsers: { id: number; email: string }[] = []

  if (userIds === 'all') {
    // Get all active users
    const allUsers = await db.query.users.findMany({
      where: (u, { eq }) => eq(u.isActive, true),
      columns: {
        id: true,
        email: true,
      },
    })
    targetUsers = allUsers
  } else {
    // Get specific users by IDs
    const { inArray } = await import('drizzle-orm')
    const allUsers = await db.query.users.findMany({
      where: (u, { eq, and, inArray }) => and(
        eq(u.isActive, true),
        inArray(u.id, userIds)
      ),
      columns: {
        id: true,
        email: true,
      },
    })
    targetUsers = allUsers
  }

  logger.info({
    type: 'worker',
    jobId: job.id,
    queue: QUEUE_NAMES.BROADCAST,
    totalUsers: targetUsers.length,
  })

  // Queue emails in batches
  let processed = 0
  const totalUsers = targetUsers.length

  for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
    const batch = targetUsers.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map((user) =>
        emailQueue.add(
          'send',
          {
            type: 'email',
            to: user.email,
            subject,
            html: body,
          },
          {
            jobId: `broadcast-${job.id}-${user.id}`,
          }
        )
      )
    )

    processed += batch.length

    // Update progress
    const progress = Math.round((processed / totalUsers) * 100)
    await job.updateProgress(progress)

    logger.debug({
      type: 'worker',
      jobId: job.id,
      queue: QUEUE_NAMES.BROADCAST,
      processed,
      total: totalUsers,
      progress,
    })
  }

  logger.info({
    type: 'worker',
    jobId: job.id,
    queue: QUEUE_NAMES.BROADCAST,
    status: 'complete',
    totalQueued: processed,
  })
}
