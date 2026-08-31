import { userRepository } from '../db/index'

/**
 * USER SERVICE
 * Penjelasan: Business logic untuk user management
 */
export const userService = {
  /**
   * Method: getProfile
   * Param: userId
   * Return: User profile atau throw error
   *
   * Business Rules:
   * - User harus ada
   * - Password hash TIDAK dikembalikan ke client
   */
  getProfile: async (userId: number) => {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new Error('User tidak ditemukan')
    }

    // Hapus passwordHash sebelum return
    const { passwordHash: _, ...userProfile } = user
    return userProfile
  },

  /**
   * Method: updateProfile
   * Param: userId, { name?, email? }
   * Return: Updated user atau throw error
   *
   * Business Rules:
   * - Email harus unik (jika di-update)
   * - User harus ada
   */
  updateProfile: async (
    userId: number,
    data: { name?: string; email?: string }
  ) => {
    // Jika update email, check apakah email sudah dipakai user lain
    if (data.email) {
      const existingUser = await userRepository.findByEmail(data.email)
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email sudah digunakan user lain')
      }
    }

    const success = await userRepository.update(userId, data)
    if (!success) {
      throw new Error('Gagal update profile')
    }

    return userService.getProfile(userId)
  },

  /**
   * Method: listUsers
   * Param: { limit, offset, requesterRole }
   * Return: Array users (admin only)
   *
   * Business Rules:
   * - Hanya admin yang bisa lihat semua user
   * - Non-admin hanya bisa lihat diri sendiri
   */
  listUsers: async (
    requester: { id: number; role: 'user' | 'admin' },
    options?: { limit?: number; offset?: number }
  ) => {
    // RBAC: Hanya admin yang bisa list semua user
    if (requester.role !== 'admin') {
      // Non-admin hanya bisa lihat dirinya sendiri
      const user = await userRepository.findById(requester.id)
      if (!user) return []
      const { passwordHash: _, ...userWithoutPassword } = user
      return [userWithoutPassword]
    }

    const users = await userRepository.findAll(options)

    // Hapus passwordHash dari semua user
    return users.map(({ passwordHash: _, ...user }) => user)
  },

  /**
   * Method: deleteUser
   * Param: userIdToDelete, requesterId, requesterRole
   * Return: boolean
   *
   * Business Rules:
   * - Hanya admin yang bisa hapus user
   * - Admin tidak bisa hapus dirinya sendiri
   * - User biasa tidak bisa hapus user lain
   */
  deleteUser: async (
    userIdToDelete: number,
    requester: { id: number; role: 'user' | 'admin' }
  ) => {
    // RBAC: Hanya admin
    if (requester.role !== 'admin') {
      throw new Error('Tidak punya akses')
    }

    // Self-protection: Admin tidak bisa hapus dirinya sendiri
    if (userIdToDelete === requester.id) {
      throw new Error('Tidak bisa hapus akun sendiri')
    }

    return userRepository.delete(userIdToDelete)
  },

  /**
   * Method: changeRole
   * Param: targetUserId, newRole, requester
   * Return: Updated user
   *
   * Business Rules:
   * - Hanya super-admin (master admin) yang bisa ubah role
   * - Tidak bisa ubah role diri sendiri
   */
  changeRole: async (
    targetUserId: number,
    newRole: 'user' | 'admin',
    requester: { id: number; role: 'user' | 'admin' }
  ) => {
    // RBAC: Pastikan requester admin
    if (requester.role !== 'admin') {
      throw new Error('Hanya admin yang bisa ubah role')
    }

    // Self-protection
    if (targetUserId === requester.id) {
      throw new Error('Tidak bisa ubah role diri sendiri')
    }

    const success = await userRepository.update(targetUserId, { role: newRole })
    if (!success) {
      throw new Error('Gagal ubah role')
    }

    return userService.getProfile(targetUserId)
  },
}
