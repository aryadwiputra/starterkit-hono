import { mysqlTable, text, int, datetime, varchar, boolean } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

/**
 * MySQL Schema
 * Used for drizzle-kit migrations when DB_CONNECTION=mysql
 */

/**
 * TABEL: permissions
 */
export const permissions = mysqlTable('permissions', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  resource: varchar('resource', { length: 255 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

/**
 * TABEL: roles
 */
export const roles = mysqlTable('roles', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}))

/**
 * TABEL: role_permissions
 */
export const rolePermissions = mysqlTable('role_permissions', {
  roleId: int('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: int('permission_id')
    .notNull()
    .references(() => permissions.id, { onDelete: 'cascade' }),
})

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}))

/**
 * TABEL: user_roles
 */
export const userRoles = mysqlTable('user_roles', {
  userId: int('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: int('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
})

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}))

/**
 * TABEL: users
 */
export const users = mysqlTable('users', {
  id: int('id').primaryKey({ autoIncrement: true }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: int('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
}))

/**
 * TABEL: sessions
 */
export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: datetime('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

/**
 * TABEL: password_resets
 */
export const passwordResets = mysqlTable('password_resets', {
  id: int('id').primaryKey({ autoIncrement: true }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  expiresAt: datetime('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * TABEL: audit_logs
 */
export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').primaryKey({ autoIncrement: true }),
  userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * TABEL: files
 */
export const files = mysqlTable('files', {
  id: int('id').primaryKey({ autoIncrement: true }),
  userId: int('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull().unique(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: int('size').notNull(),
  createdAt: int('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}))

// Type exports
export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert
export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert
export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type PasswordReset = typeof passwordResets.$inferSelect
export type NewPasswordReset = typeof passwordResets.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
