import { userRepository, sessionRepository, passwordResetRepository } from '../db/index'
import { passwordService } from './password.service'
import { nanoid } from 'nanoid'

/**
 * AUTH SERVICE
 * Penjelasan: Semua business logic terkait authentication
 *
 * SECURITY NOTES:
 * - Password TIDAK pernah di-hash di sini (delegasi ke passwordService)
 * - Session ID pakai UUID (nanoid) untuk keamanan
 */
export const authService = {
  /**
   * Method: register
   * Param: { email, password, name }
   * Return: { user, sessionId } atau throw error
   *
   * Business Rules:
   * 1. Email harus unik
   * 2. Password minimal 8 karakter
   * 3. Password di-hash sebelum simpan
   * 4. Session dibuat otomatis setelah register
   */
  register: async (data: {
    email: string
    password: string
    name: string
  }) => {
    // Rule: Check apakah email sudah terdaftar
    const existingUser = await userRepository.findByEmail(data.email)
    if (existingUser) {
      throw new Error('Email sudah terdaftar')
    }

    // Rule: Validasi password strength
    if (data.password.length < 8) {
      throw new Error('Password minimal 8 karakter')
    }

    // SECURITY: Hash password SEBELUM simpan
    // JANGAN pernah simpan password plain text
    const passwordHash = await passwordService.hash(data.password)

    // Buat user baru di database
    const userId = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
    })

    // Ambil data user yang baru dibuat
    const user = await userRepository.findById(userId)
    if (!user) throw new Error('Gagal membuat user')

    // Buat session untuk user yang baru register
    const sessionId = nanoid(32) // 32 character random string
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 hari

    await sessionRepository.create({
      id: sessionId,
      userId: user.id,
      expiresAt,
    })

    // Remove passwordHash sebelum return
    const { passwordHash: _, ...safeUser } = user
    return { user: safeUser, sessionId }
  },

  /**
   * Method: login
   * Param: { email, password }
   * Return: { user, sessionId } atau throw error
   *
   * Business Rules:
   * 1. User harus ada
   * 2. Password harus match
   * 3. Session baru dibuat (reuse session lama jika mau)
   */
  login: async (data: { email: string; password: string }) => {
    // Cari user berdasarkan email
    const user = await userRepository.findByEmail(data.email)
    if (!user) {
      // Generic error message (tidak reveal apakah email exists)
      throw new Error('Email atau password salah')
    }

    // SECURITY: Verifikasi password
    // Bandingkan plain password dengan hash di database
    const isValid = await passwordService.verify(data.password, user.passwordHash)
    if (!isValid) {
      throw new Error('Email atau password salah')
    }

    // Buat session baru
    const sessionId = nanoid(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 hari

    await sessionRepository.create({
      id: sessionId,
      userId: user.id,
      expiresAt,
    })

    // Return user tanpa passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user
    return { user: userWithoutPassword, sessionId }
  },

  /**
   * Method: logout
   * Param: sessionId
   * Penjelasan: Hapus session (invalidate token)
   */
  logout: async (sessionId: string) => {
    await sessionRepository.delete(sessionId)
  },

  /**
   * Method: validateSession
   * Param: sessionId
   * Return: User object jika valid, null jika invalid/expired
   *
   * Penjelasan: Cek apakah session masih aktif
   * Dipakai di middleware untuk proteksi route
   */
  validateSession: async (sessionId: string) => {
    const session = await sessionRepository.findById(sessionId)

    // Session tidak ada atau expired
    if (!session) return null

    // Return user data (tanpa passwordHash)
    const { passwordHash: _, ...user } = session.user
    return user
  },

  /**
   * Method: logoutAllDevices
   * Param: userId
   * Penjelasan: Hapus semua session user (logout everywhere)
   */
  logoutAllDevices: async (userId: number) => {
    await sessionRepository.deleteAllUserSessions(userId)
  },

  /**
   * Method: forgotPassword
   * Param: email
   * Return: token ( untuk dikirim via email)
   *
   * Penjelasan: Generate reset token untuk user
   * NOTE: Selalu return success, même jika email tidak ada (security)
   */
  forgotPassword: async (email: string) => {
    // Check apakah user ada
    const user = await userRepository.findByEmail(email)

    // Selalu return success (jangan reveal apakah email exists)
    if (!user) {
      return { message: 'Jika email terdaftar, link reset akan dikirim' }
    }

    // Generate reset token
    const token = nanoid(48) // 48 character token

    // Token expires dalam 1 jam
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await passwordResetRepository.create({
      token,
      email,
      expiresAt,
    })

    // Di production: kirim email dengan link reset
    // Link: https://app.com/auth/reset-password?token=${token}
    console.log(`🔑 Reset token for ${email}: ${token}`)

    return { message: 'Jika email terdaftar, link reset akan dikirim' }
  },

  /**
   * Method: resetPassword
   * Param: { token, newPassword }
   * Return: boolean
   *
   * Penjelasan: Reset password dengan token
   */
  resetPassword: async (data: { token: string; newPassword: string }) => {
    // Validate password
    if (data.newPassword.length < 8) {
      throw new Error('Password minimal 8 karakter')
    }

    // Find token
    const reset = await passwordResetRepository.findByToken(data.token)
    if (!reset) {
      throw new Error('Token invalid atau expired')
    }

    // Find user
    const user = await userRepository.findByEmail(reset.email)
    if (!user) {
      throw new Error('User tidak ditemukan')
    }

    // Hash new password
    const passwordHash = await passwordService.hash(data.newPassword)

    // Update user password
    await userRepository.update(user.id, { passwordHash })

    // Delete used token
    await passwordResetRepository.delete(reset.id)

    // Logout semua device (security)
    await sessionRepository.deleteAllUserSessions(user.id)

    return { message: 'Password berhasil direset' }
  },
}
