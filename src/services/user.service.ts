import { userRepository } from '../db/index'
import { hasRole, assignRoleToUser, removeRoleFromUser, getRoleId } from '../lib/rbac'

/**
 * USER SERVICE
 * Penjelasan: Business logic untuk user management
 */
export const userService = {
  /**
   * Method: getProfile
   * Param: userId
   * Return: User profile atau throw error
   */
  getProfile: async (userId: number) => {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new Error('User tidak ditemukan')
    }

    const { passwordHash: _, ...userProfile } = user
    return userProfile
  },

  /**
   * Method: updateProfile
   * Param: userId, { name?, email? }
   * Return: Updated user
   */
  updateProfile: async (
    userId: number,
    data: { name?: string; email?: string }
  ) => {
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
   * Param: requester, { limit, offset }
   * Return: Array users
   * Note: Permission check dilakukan di middleware
   */
  listUsers: async (
    requester: { id: number },
    options?: { limit?: number; offset?: number }
  ) => {
    const users = await userRepository.findAll(options)
    return users.map(({ passwordHash: _, ...user }) => user)
  },

  /**
   * Method: deleteUser
   * Param: userIdToDelete, requester
   * Note: Permission check dilakukan di middleware
   */
  deleteUser: async (
    userIdToDelete: number,
    requester: { id: number }
  ) => {
    // Self-protection: tidak bisa hapus diri sendiri
    if (userIdToDelete === requester.id) {
      throw new Error('Tidak bisa hapus akun sendiri')
    }

    return userRepository.delete(userIdToDelete)
  },

  /**
   * Method: changeRole
   * Param: targetUserId, newRole (role name), requester
   * Note: Permission check dilakukan di middleware
   */
  changeRole: async (
    targetUserId: number,
    newRoleName: 'user' | 'admin',
    requester: { id: number }
  ) => {
    // Self-protection: tidak bisa ubah role diri sendiri
    if (targetUserId === requester.id) {
      throw new Error('Tidak bisa ubah role diri sendiri')
    }

    // Remove semua roles dari user
    await removeRoleFromUser(targetUserId, 'admin')
    await removeRoleFromUser(targetUserId, 'user')

    // Assign role baru
    await assignRoleToUser(targetUserId, newRoleName)

    return userService.getProfile(targetUserId)
  },
}
