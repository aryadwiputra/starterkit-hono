import { db, auditLogs } from '../db'
import { eq, and, gte, lte, like, desc } from 'drizzle-orm'

/**
 * Audit Service
 *
 * Query dan filter audit logs
 */

interface AuditFilter {
  userId?: number
  resource?: string
  action?: 'create' | 'update' | 'delete'
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export const auditService = {
  /**
   * Get audit logs dengan filter
   */
  async getLogs(filter: AuditFilter = {}) {
    const conditions = []

    if (filter.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId))
    }

    if (filter.resource) {
      conditions.push(eq(auditLogs.resource, filter.resource))
    }

    if (filter.action) {
      conditions.push(eq(auditLogs.action, filter.action))
    }

    if (filter.from) {
      conditions.push(gte(auditLogs.createdAt, filter.from))
    }

    if (filter.to) {
      conditions.push(lte(auditLogs.createdAt, filter.to))
    }

    const logs = await db.query.auditLogs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(auditLogs.createdAt)],
      limit: filter.limit ?? 50,
      offset: filter.offset ?? 0,
    })

    // Parse JSON values
    return logs.map((log) => ({
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
    }))
  },

  /**
   * Get audit log by ID
   */
  async getLogById(id: number) {
    const log = await db.query.auditLogs.findFirst({
      where: eq(auditLogs.id, id),
    })

    if (!log) return null

    return {
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
    }
  },

  /**
   * Get audit logs untuk resource tertentu
   */
  async getResourceHistory(resource: string, resourceId: string) {
    const logs = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.resource, resource),
        eq(auditLogs.resourceId, resourceId)
      ),
      orderBy: [desc(auditLogs.createdAt)],
    })

    return logs.map((log) => ({
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
    }))
  },

  /**
   * Count logs dengan filter
   */
  async countLogs(filter: AuditFilter = {}) {
    const conditions = []

    if (filter.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId))
    }

    if (filter.resource) {
      conditions.push(eq(auditLogs.resource, filter.resource))
    }

    if (filter.action) {
      conditions.push(eq(auditLogs.action, filter.action))
    }

    if (filter.from) {
      conditions.push(gte(auditLogs.createdAt, filter.from))
    }

    if (filter.to) {
      conditions.push(lte(auditLogs.createdAt, filter.to))
    }

    const result = await db
      .select({ count: auditLogs.id })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return result.length
  },
}
