/**
 * Database Module
 * Uses factory pattern to support MySQL, PostgreSQL, SQLite
 */

import { createConnection } from './connection'
import { createSchema, type Dialect, type Schema } from './schema-factory'
import { env } from '../lib/env'
import { eq, lt } from 'drizzle-orm'

const dialect: Dialect = env.DB_CONNECTION
const schema = createSchema(dialect)
const { db, healthCheck: dbHealthCheck } = createConnection(
  dialect,
  env.DATABASE_URL,
  schema,
)

export { db, dbHealthCheck, schema }
export const {
  users,
  usersRelations,
  sessions,
  sessionsRelations,
  passwordResets,
  permissions,
  permissionsRelations,
  roles,
  rolesRelations,
  rolePermissions,
  rolePermissionsRelations,
  userRoles,
  userRolesRelations,
  auditLogs,
  files,
  filesRelations,
} = schema

export type { Schema }
export type { Dialect }

export const userRepository = {
  findById: async (id: number) => {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    })
    return result ?? null
  },

  findByEmail: async (email: string) => {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    })
    return result ?? null
  },

  create: async (data: {
    email: string
    passwordHash: string
    name: string
  }) => {
    await db.insert(schema.users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
    })
    const created = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, data.email),
    })
    return created?.id ?? null
  },

  update: async (
    id: number,
    data: { name?: string; email?: string },
  ) => {
    const result = await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))

    return result.changes > 0
  },

  delete: async (id: number) => {
    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))

    return result.changes > 0
  },

  findAll: async (options?: { limit?: number; offset?: number }) => {
    return db.query.users.findMany({
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    })
  },
}

export const sessionRepository = {
  create: async (data: {
    id: string
    userId: number
    expiresAt: Date
  }) => {
    await db.insert(schema.sessions).values(data)
  },

  findById: async (id: string) => {
    const result = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, id),
      with: { user: true },
    })

    if (result && result.expiresAt < new Date()) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, id))
      return null
    }

    return result ?? null
  },

  delete: async (id: string) => {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id))
  },

  deleteAllUserSessions: async (userId: number) => {
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, userId))
  },

  cleanupExpired: async () => {
    await db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, new Date()))
  },
}

export const passwordResetRepository = {
  create: async (data: {
    token: string
    email: string
    expiresAt: Date
  }) => {
    await db
      .delete(schema.passwordResets)
      .where(eq(schema.passwordResets.email, data.email))

    await db.insert(schema.passwordResets).values(data)
  },

  findByToken: async (token: string) => {
    const result = await db.query.passwordResets.findFirst({
      where: (pr, { eq }) => eq(pr.token, token),
    })

    if (result && result.expiresAt < new Date()) {
      await db
        .delete(schema.passwordResets)
        .where(eq(schema.passwordResets.id, result.id))
      return null
    }

    return result ?? null
  },

  delete: async (id: number) => {
    await db.delete(schema.passwordResets).where(eq(schema.passwordResets.id, id))
  },

  deleteByEmail: async (email: string) => {
    await db
      .delete(schema.passwordResets)
      .where(eq(schema.passwordResets.email, email))
  },

  cleanupExpired: async () => {
    await db
      .delete(schema.passwordResets)
      .where(lt(schema.passwordResets.expiresAt, new Date()))
  },
}
