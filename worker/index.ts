import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '../src/lib/logger'
import { env } from '../src/lib/env'
import { processEmailJob } from './jobs/email'
import { processBroadcastJob } from './jobs/broadcast'
import { QUEUE_NAMES, type JobData } from '../shared/jobs'

/**
 * Worker Entry Point
 *
 * Start worker untuk process queue jobs
 */

const redisUrl = env.REDIS_URL

if (!redisUrl) {
  console.error('❌ REDIS_URL not configured')
  console.error('Please set REDIS_URL in your environment')
  process.exit(1)
}

// Create Redis connection
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

// Create workers
const emailWorker = new Worker<JobData>(
  QUEUE_NAMES.EMAIL,
  async (job) => {
    if (job.data.type === 'email') {
      await processEmailJob(job)
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 emails per second
    },
  }
)

const broadcastWorker = new Worker<JobData>(
  QUEUE_NAMES.BROADCAST,
  async (job) => {
    if (job.data.type === 'broadcast') {
      await processBroadcastJob(job)
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 broadcasts at a time
  }
)

// Event handlers
emailWorker.on('completed', (job) => {
  logger.info({
    type: 'worker',
    worker: 'email',
    jobId: job.id,
    status: 'completed',
  })
})

emailWorker.on('failed', (job, err) => {
  logger.error({
    type: 'worker',
    worker: 'email',
    jobId: job?.id,
    error: err.message,
    status: 'failed',
  })
})

broadcastWorker.on('completed', (job) => {
  logger.info({
    type: 'worker',
    worker: 'broadcast',
    jobId: job.id,
    status: 'completed',
  })
})

broadcastWorker.on('failed', (job, err) => {
  logger.error({
    type: 'worker',
    worker: 'broadcast',
    jobId: job?.id,
    error: err.message,
    status: 'failed',
  })
})

// Graceful shutdown
async function shutdown() {
  logger.info({ type: 'worker', message: 'Shutting down workers...' })

  await emailWorker.close()
  await broadcastWorker.close()
  await connection.quit()

  logger.info({ type: 'worker', message: 'Workers stopped' })
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

logger.info({
  type: 'worker',
  message: 'Worker started',
  queues: [QUEUE_NAMES.EMAIL, QUEUE_NAMES.BROADCAST],
})
