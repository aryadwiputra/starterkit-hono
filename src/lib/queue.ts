import { Queue } from 'bullmq'
import { getRedis } from './redis'
import { logger } from './logger'
import { QUEUE_NAMES, type JobData } from '../../shared/jobs'

/**
 * Queue Manager
 *
 * Create dan manage BullMQ queues
 */

let emailQueue: Queue<JobData> | null = null
let broadcastQueue: Queue<JobData> | null = null

/**
 * Get or create email queue
 */
export function getEmailQueue(): Queue<JobData> | null {
  const redis = getRedis()

  if (!redis) {
    logger.warn({ type: 'queue', message: 'Redis not configured, queues disabled' })
    return null
  }

  if (!emailQueue) {
    emailQueue = new Queue<JobData>(QUEUE_NAMES.EMAIL, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 500,
        },
      },
    })

    logger.info({ type: 'queue', queue: QUEUE_NAMES.EMAIL, message: 'Email queue initialized' })
  }

  return emailQueue
}

/**
 * Get or create broadcast queue
 */
export function getBroadcastQueue(): Queue<JobData> | null {
  const redis = getRedis()

  if (!redis) {
    return null
  }

  if (!broadcastQueue) {
    broadcastQueue = new Queue<JobData>(QUEUE_NAMES.BROADCAST, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 50,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 100,
        },
      },
    })

    logger.info({ type: 'queue', queue: QUEUE_NAMES.BROADCAST, message: 'Broadcast queue initialized' })
  }

  return broadcastQueue
}

/**
 * Add email job to queue
 */
export async function queueEmail(data: {
  to: string
  subject: string
  html: string
}): Promise<string | null> {
  const queue = getEmailQueue()

  if (!queue) {
    logger.warn({ type: 'queue', message: 'Cannot queue email - Redis not available' })
    return null
  }

  const job = await queue.add('send', {
    type: 'email',
    ...data,
  })

  logger.info({
    type: 'queue',
    queue: QUEUE_NAMES.EMAIL,
    jobId: job.id,
    to: data.to,
    subject: data.subject,
  })

  return job.id as string
}

/**
 * Add broadcast job to queue
 */
export async function queueBroadcast(data: {
  userIds: number[] | 'all'
  subject: string
  body: string
}): Promise<string | null> {
  const queue = getBroadcastQueue()

  if (!queue) {
    logger.warn({ type: 'queue', message: 'Cannot queue broadcast - Redis not available' })
    return null
  }

  const job = await queue.add('broadcast', {
    type: 'broadcast',
    ...data,
  })

  logger.info({
    type: 'queue',
    queue: QUEUE_NAMES.BROADCAST,
    jobId: job.id,
    userCount: data.userIds === 'all' ? 'all' : data.userIds.length,
  })

  return job.id as string
}

/**
 * Close all queues
 */
export async function closeQueues(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close()
    emailQueue = null
  }

  if (broadcastQueue) {
    await broadcastQueue.close()
    broadcastQueue = null
  }

  logger.info({ type: 'queue', message: 'All queues closed' })
}
