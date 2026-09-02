import { db, auditLogs } from '../db'
import { logger } from './logger'

/**
 * Audit Logger
 *
 * Track semua mutation (create, update, delete)
 * Async logging - non-blocking untuk performance
 */

type AuditAction = 'create' | 'update' | 'delete'
type AuditResource = 'users' | 'posts' | 'settings' | 'sessions' | string

interface AuditData {
  userId?: number
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log audit entry (async - non-blocking)
 */
export async function logAudit(data: AuditData): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: data.userId ?? null,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId ?? null,
      oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
      newValue: data.newValue ? JSON.stringify(data.newValue) : null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    })

    logger.debug({
      type: 'audit',
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      userId: data.userId,
    })
  } catch (error) {
    // Log error tapi jangan block request
    logger.error({
      type: 'audit',
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    })
  }
}

/**
 * Helper untuk audit create
 */
export function auditCreate(params: {
  userId?: number
  resource: AuditResource
  resourceId: string
  newValue: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  return logAudit({
    ...params,
    action: 'create',
  })
}

/**
 * Helper untuk audit update
 */
export function auditUpdate(params: {
  userId?: number
  resource: AuditResource
  resourceId: string
  oldValue: Record<string, unknown>
  newValue: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  return logAudit({
    ...params,
    action: 'update',
  })
}

/**
 * Helper untuk audit delete
 */
export function auditDelete(params: {
  userId?: number
  resource: AuditResource
  resourceId: string
  oldValue: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  return logAudit({
    ...params,
    action: 'delete',
  })
}
