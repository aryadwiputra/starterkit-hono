import { Job } from 'bullmq'
import { Resend } from 'resend'
import { logger } from '../../src/lib/logger'
import { env } from '../../src/lib/env'
import type { EmailJob } from '../../shared/jobs'

/**
 * Email Job Processor
 */

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend && env.RESEND_API_KEY) {
    resend = new Resend(env.RESEND_API_KEY)
  }
  return resend as Resend
}

/**
 * Process email job
 */
export async function processEmailJob(job: Job<EmailJob>): Promise<void> {
  const { to, subject, html } = job.data

  logger.info({
    type: 'worker',
    jobId: job.id,
    queue: 'email',
    to,
    subject,
    progress: 0,
  })

  // Update progress
  await job.updateProgress(10)

  // Check if resend is configured
  const client = getResend()

  if (!client) {
    logger.warn({
      type: 'worker',
      jobId: job.id,
      message: 'Resend not configured, skipping email',
    })
    // Still mark as complete but log warning
    await job.updateProgress(100)
    return
  }

  try {
    await job.updateProgress(30)

    const result = await client.emails.send({
      from: env.EMAIL_FROM || 'noreply@resend.dev',
      to,
      subject,
      html,
    })

    await job.updateProgress(100)

    logger.info({
      type: 'worker',
      jobId: job.id,
      queue: 'email',
      to,
      messageId: result.data?.id,
      status: 'sent',
    })
  } catch (error) {
    logger.error({
      type: 'worker',
      jobId: job.id,
      queue: 'email',
      to,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error // Re-throw untuk retry
  }
}
