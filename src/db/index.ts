import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'
import { eq, lt } from 'drizzle-orm'

/**
 * Inisialisasi Database Connection
 * Penjelasan: Buat koneksi ke SQLite database
 * Menggunakan bun:sqlite (built-in, no native build needed)
 */
const sqlite = new Database('./data.db')
export const db = drizzle(sqlite, { schema })

/**
 * USER REPOSITORY
 * Penjelasan: Semua query yang berhubungan dengan tabel 'users'
 * Pattern: static methods, tapi bisa juga pakai class
 */
export const userRepository = {
  /**
   * Method: findById
   * Param: id - user ID
   * Return: User object atau undefined
   * Penjelasan: Ambil satu user berdasarkan ID
   */
  findById: async (id: number) => {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    })
    return result ?? null // ?? = return null jika undefined
  },

  /**
   * Method: findByEmail
   * Param: email - user email
   * Return: User object atau undefined
   * Penjelasan: Ambil satu user berdasarkan email
   *             Dipakai saat login (cari user berdasarkan email)
   */
  findByEmail: async (email: string) => {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    })
    return result ?? null
  },

  /**
   * Method: create
   * Param: { email, passwordHash, name }
   * Return: Insert result (user ID)
   * Penjelasan: Buat user baru
   *
   * SECURITY NOTE:
   * - passwordHash HARUS sudah di-hash sebelum masuk ke sini
   * - Repository TIDAK hash password (bukan tanggung jawabnya)
   */
  create: async (data: {
    email: string
    passwordHash: string
    name: string
    role?: 'user' | 'admin'
  }) => {
    // Drizzle auto-generate id dan timestamp jika ada default
    const result = await db.insert(schema.users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role ?? 'user', // Default role = 'user'
    })

    // Return ID user yang baru dibuat
    return Number(result.lastInsertRowid)
  },

  /**
   * Method: update
   * Param: id, data yang mau diupdate
   * Return: boolean (success/fail)
   * Penjelasan: Update user berdasarkan ID
   */
  update: async (
    id: number,
    data: { name?: string; email?: string; role?: 'user' | 'admin' }
  ) => {
    // build: { name: ..., email: ... } hanya field yang ada isinya
    const result = await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(), // Selalu update timestamp
      })
      .where(eq(schema.users.id, id)) // WHERE id = ?

    return result.changes > 0 // true jika ada row yang berubah
  },

  /**
   * Method: delete
   * Param: id - user ID
   * Return: boolean
   * Penjelasan: Hapus user berdasarkan ID
   *             Cascade akan hapus semua session terkait
   */
  delete: async (id: number) => {
    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))

    return result.changes > 0
  },

  /**
   * Method: findAll
   * Param: options { limit, offset }
   * Return: Array of users
   * Penjelasan: Ambil semua users (pakai pagination)
   */
  findAll: async (options?: { limit?: number; offset?: number }) => {
    return db.query.users.findMany({
      limit: options?.limit ?? 50, // Default 50 user per request
      offset: options?.offset ?? 0,
      orderBy: (users, { desc }) => [desc(users.createdAt)], // Terbaru dulu
    })
  },
}

/**
 * SESSION REPOSITORY
 * Penjelasan: Semua query untuk tabel 'sessions'
 *             Sessions dipakai untuk server-side session tracking
 */
export const sessionRepository = {
  /**
   * Method: create
   * Penjelasan: Buat session baru saat user login
   * Param: userId, sessionId (UUID), expiresAt
   */
  create: async (data: {
    id: string // UUID, di-generate di service layer
    userId: number
    expiresAt: Date
  }) => {
    await db.insert(schema.sessions).values(data)
  },

  /**
   * Method: findById
   * Penjelasan: Ambil session + data user-nya (JOIN)
   *             Dipakai untuk validasi session masih aktif
   */
  findById: async (id: string) => {
    const result = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, id),
      // with: eager load relasi user
      with: {
        user: true, // JOIN dengan tabel users
      },
    })

    // Check apakah session sudah expired
    if (result && result.expiresAt < new Date()) {
      // Auto-delete expired session
      await db.delete(schema.sessions).where(eq(schema.sessions.id, id))
      return null
    }

    return result ?? null
  },

  /**
   * Method: delete
   * Penjelasan: Hapus session (logout)
   */
  delete: async (id: string) => {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id))
  },

  /**
   * Method: deleteAllUserSessions
   * Penjelasan: Hapus semua session user (logout all devices)
   */
  deleteAllUserSessions: async (userId: number) => {
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, userId))
  },

  /**
   * Method: cleanupExpired
   * Penjelasan: Hapus semua expired sessions (maintenance)
   *             Bisa dipanggil periodik via cron/scheduler
   */
  cleanupExpired: async () => {
    await db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, new Date()))
  },
}

/**
 * PASSWORD RESET REPOSITORY
 * Penjelasan: Semua query untuk tabel 'password_resets'
 */
export const passwordResetRepository = {
  /**
   * Method: create
   * Penjelasan: Buat token reset password baru
   */
  create: async (data: {
    token: string
    email: string
    expiresAt: Date
  }) => {
    // Hapus token lama untuk email yang sama (jika ada)
    await db
      .delete(schema.passwordResets)
      .where(eq(schema.passwordResets.email, data.email))

    await db.insert(schema.passwordResets).values(data)
  },

  /**
   * Method: findByToken
   * Penjelasan: Cari token reset, return null jika expired atau tidak ada
   */
  findByToken: async (token: string) => {
    const result = await db.query.passwordResets.findFirst({
      where: (pr, { eq }) => eq(pr.token, token),
    })

    // Check expired
    if (result && result.expiresAt < new Date()) {
      await db
        .delete(schema.passwordResets)
        .where(eq(schema.passwordResets.id, result.id))
      return null
    }

    return result ?? null
  },

  /**
   * Method: delete
   * Penjelasan: Hapus token setelah digunakan
   */
  delete: async (id: number) => {
    await db.delete(schema.passwordResets).where(eq(schema.passwordResets.id, id))
  },

  /**
   * Method: deleteByEmail
   * Penjelasan: Hapus semua token untuk email
   */
  deleteByEmail: async (email: string) => {
    await db
      .delete(schema.passwordResets)
      .where(eq(schema.passwordResets.email, email))
  },

  /**
   * Method: cleanupExpired
   * Penjelasan: Hapus semua token expired
   */
  cleanupExpired: async () => {
    await db
      .delete(schema.passwordResets)
      .where(lt(schema.passwordResets.expiresAt, new Date()))
  },
}
