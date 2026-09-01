import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

/**
 * TABEL: permissions
 * Penjelasan: Granular permissions untuk RBAC
 * Pattern: resource:action (contoh: users:create, posts:read)
 */
export const permissions = sqliteTable('permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // contoh: 'users:create'
  description: text('description'), // contoh: 'Buat user baru'
  resource: text('resource').notNull(), // contoh: 'users', 'posts'
  action: text('action').notNull(), // contoh: 'create', 'read', 'update', 'delete'
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

/**
 * TABEL: roles
 * Penjelasan: Role definitions untuk RBAC
 */
export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // contoh: 'admin', 'user'
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}))

/**
 * TABEL: role_permissions
 * Penjelasan: Junction table - many-to-many roles ↔ permissions
 */
export const rolePermissions = sqliteTable('role_permissions', {
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id')
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
 * Penjelasan: Junction table - many-to-many users ↔ roles
 */
export const userRoles = sqliteTable('user_roles', {
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id')
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
 * Penjelasan: Menyimpan data user account
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * RELASI: Defines how tables relate to each other
 */
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
}))

/**
 * TABEL: sessions
 * Penjelasan: Menyimpan active user sessions
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
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
 * Penjelasan: Menyimpan token reset password
 */
export const passwordResets = sqliteTable('password_resets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

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
