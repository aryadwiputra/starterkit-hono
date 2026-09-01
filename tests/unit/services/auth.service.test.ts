import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test'
import { passwordService } from '../../../src/services/password.service'

// Mock repositories
const mockUserRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockSessionRepository = {
  create: vi.fn(),
  delete: vi.fn(),
  deleteAllUserSessions: vi.fn(),
  findById: vi.fn(),
}

const mockPasswordResetRepository = {
  create: vi.fn(),
  findByToken: vi.fn(),
  delete: vi.fn(),
  deleteByEmail: vi.fn(),
}

// Mock the db module
vi.mock('../../../src/db/index', () => ({
  userRepository: mockUserRepository,
  sessionRepository: mockSessionRepository,
  passwordResetRepository: mockPasswordResetRepository,
}))

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('register', () => {
    test('should throw error if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 1, email: 'test@test.com' })

      const { authService } = await import('../../../src/services/auth.service')

      await expect(
        authService.register({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Email sudah terdaftar')
    })

    test('should throw error if password too short', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      const { authService } = await import('../../../src/services/auth.service')

      await expect(
        authService.register({
          email: 'test@test.com',
          password: 'short',
          name: 'Test User',
        })
      ).rejects.toThrow('Password minimal 8 karakter')
    })

    test('should create user and session successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)
      mockUserRepository.create.mockResolvedValue(1)
      mockUserRepository.findById.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockSessionRepository.create.mockResolvedValue(undefined)

      const { authService } = await import('../../../src/services/auth.service')

      const result = await authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      })

      expect(result.user.email).toBe('test@test.com')
      expect(result.sessionId).toBeTruthy()
      expect(result.user.passwordHash).toBeUndefined()
      expect(mockSessionRepository.create).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    test('should throw error if user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      const { authService } = await import('../../../src/services/auth.service')

      await expect(
        authService.login({
          email: 'notfound@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email atau password salah')
    })

    test('should throw error if password is wrong', async () => {
      const hashedPassword = await passwordService.hash('correctpassword')
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        passwordHash: hashedPassword,
      })

      const { authService } = await import('../../../src/services/auth.service')

      await expect(
        authService.login({
          email: 'test@test.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Email atau password salah')
    })

    test('should login successfully with correct credentials', async () => {
      const password = 'correctpassword'
      const hashedPassword = await passwordService.hash(password)
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockSessionRepository.create.mockResolvedValue(undefined)

      const { authService } = await import('../../../src/services/auth.service')

      const result = await authService.login({
        email: 'test@test.com',
        password,
      })

      expect(result.user.email).toBe('test@test.com')
      expect(result.sessionId).toBeTruthy()
      expect(result.user.passwordHash).toBeUndefined()
    })
  })

  describe('validateSession', () => {
    test('should return null for invalid session', async () => {
      mockSessionRepository.findById.mockResolvedValue(null)

      const { authService } = await import('../../../src/services/auth.service')

      const result = await authService.validateSession('invalid-session')
      expect(result).toBeNull()
    })

    test('should return user for valid session', async () => {
      mockSessionRepository.findById.mockResolvedValue({
        id: 'valid-session',
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 1,
          email: 'test@test.com',
          name: 'Test User',
          role: 'user',
          passwordHash: 'somehash',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const { authService } = await import('../../../src/services/auth.service')

      const result = await authService.validateSession('valid-session')

      expect(result).not.toBeNull()
      expect(result?.email).toBe('test@test.com')
      expect(result?.passwordHash).toBeUndefined()
    })
  })

  describe('logout', () => {
    test('should delete session', async () => {
      mockSessionRepository.delete.mockResolvedValue(undefined)

      const { authService } = await import('../../../src/services/auth.service')

      await authService.logout('session-id')

      expect(mockSessionRepository.delete).toHaveBeenCalledWith('session-id')
    })
  })

  describe('logoutAllDevices', () => {
    test('should delete all user sessions', async () => {
      mockSessionRepository.deleteAllUserSessions.mockResolvedValue(undefined)

      const { authService } = await import('../../../src/services/auth.service')

      await authService.logoutAllDevices(1)

      expect(mockSessionRepository.deleteAllUserSessions).toHaveBeenCalledWith(1)
    })
  })
})
