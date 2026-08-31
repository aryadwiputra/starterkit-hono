import bcrypt from 'bcryptjs'

/**
 * PASSWORD SERVICE
 * Penjelasan: Helper untuk password hashing
 * Menggunakan bcrypt dengan salt rounds = 10
 *
 * Kenapa bcrypt?
 * - Designed untuk password (slow hash)
 * - salt (tidak perlu simpan salt terpisah)
 * - Adaptive (bisa increase cost factor seiring waktu)
 */
export const passwordService = {
  /**
   * Method: hash
   * Param: plain password
   * Return: hashed password
   */
  hash: async (password: string): Promise<string> => {
    const saltRounds = 10
    return bcrypt.hash(password, saltRounds)
  },

  /**
   * Method: verify
   * Param: plain password, hashed password
   * Return: boolean
   * Penjelasan: Bandingkan password dengan hash
   */
  verify: async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash)
  },
}
