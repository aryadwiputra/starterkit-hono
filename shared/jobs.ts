/**
 * Job Type Definitions
 *
 * Shared types untuk producer (API) dan consumer (Worker)
 */

export interface EmailJob {
  type: 'email'
  to: string
  subject: string
  html: string
}

export interface BroadcastJob {
  type: 'broadcast'
  userIds: number[] | 'all'
  subject: string
  body: string
}

export type JobData = EmailJob | BroadcastJob

export const QUEUE_NAMES = {
  EMAIL: 'email',
  BROADCAST: 'broadcast',
} as const
