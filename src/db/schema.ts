import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

/**
 * TABEL: users
 * Penjelasan: Menyimpan data user account
 */
export const users = sqliteTable('users', {
  // Primary key - auto increment oleh SQLite
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Email - unique constraint supaya tidak ada duplikat
  email: text('email').notNull().unique(),

  // Password hash - JANGAN simpan password plain text!
  // Selalu hash sebelum simpan, bandingkan hash saat login
  passwordHash: text('password_hash').notNull(),

  // Nama user
  name: text('name').notNull(),

  // Role untuk RBAC - default 'user', bisa 'admin'
  // Menggunakan text karena SQLite tidak punya enum native
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),

  // Timestamp untuk tracking kapan data dibuat/diubah
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * RELASI: Defines how tables relate to each other
 * Penjelasan: Satu user bisa punya banyak session
 */
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}))

/**
 * TABEL: sessions
 * Penjelasan: Menyimpan active user sessions
 * Berbeda dari JWT - ini untuk server-side session tracking
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // UUID untuk session ID

  // Foreign key ke users.id
  // CASCADE DELETE = jika user dihapus, semua session-nya ikut dihapus
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Expired timestamp - session invalid setelah waktu ini
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * Relasi: satu session milik satu user
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

/**
 * TABEL: password_resets
 * Penjelasan: Menyimpan token reset password
 * Token expires dalam 1 jam setelah dibuat
 */
export const passwordResets = sqliteTable('password_resets', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Token unik untuk reset password
  token: text('token').notNull().unique(),

  // Email user yang minta reset
  email: text('email').notNull(),

  // Expired timestamp
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// Type exports untuk use di seluruh app
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type PasswordReset = typeof passwordResets.$inferSelect
export type NewPasswordReset = typeof passwordResets.$inferInsert
