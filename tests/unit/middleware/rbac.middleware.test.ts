import { describe, test, expect, beforeEach, vi } from 'bun:test'
import { Hono } from 'hono'
import { requirePermission, requireRole, requireOwnerOrPermission, allowSelfOrPermission } from '../../../src/middleware/rbac.middleware'

// Mock rbac functions
const mockHasPermission = vi.fn()
const mockHasRole = vi.fn()

vi.mock('../../../src/lib/rbac', () => ({
  hasPermission: (...args: any[]) => mockHasPermission(...args),
  hasRole: (...args: any[]) => mockHasRole(...args),
}))

describe('RBAC Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockReset()
    mockHasRole.mockReset()
  })

  const createMockContext = (user: any, paramId?: string) => {
    const c: any = {
      _getValues: { user },
      get: (key: string) => c._getValues[key],
      set: (key: string, value: any) => {
        c._getValues[key] = value
      },
      req: {
        param: (key?: string) => (key === 'id' ? paramId : undefined),
      },
      json: (data: any, status?: number) => {
        c._status = status || 200
        c._data = data
        return data
      },
      _status: 200,
      _data: null,
    }
    return c
  }

  describe('requirePermission', () => {
    test('should allow user with required permission', async () => {
      mockHasRole.mockResolvedValue(false)
      mockHasPermission.mockResolvedValue(true)

      const middleware = requirePermission('users:read')
      const c = createMockContext({ id: 1 })
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should reject user without required permission', async () => {
      mockHasRole.mockResolvedValue(false)
      mockHasPermission.mockResolvedValue(false)

      const middleware = requirePermission('users:delete')
      const c = createMockContext({ id: 1 })
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(403)
    })

    test('should allow admin regardless of permission', async () => {
      mockHasRole.mockResolvedValue(true)

      const middleware = requirePermission('users:delete')
      const c = createMockContext({ id: 1 })
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(mockHasPermission).not.toHaveBeenCalled()
    })
  })

  describe('requireRole', () => {
    test('should allow user with required role', async () => {
      mockHasRole.mockResolvedValue(true)

      const middleware = requireRole('admin')
      const c = createMockContext({ id: 1 })
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should reject user without required role', async () => {
      mockHasRole.mockResolvedValue(false)

      const middleware = requireRole('admin')
      const c = createMockContext({ id: 1 })
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(403)
    })
  })

  describe('allowSelfOrPermission', () => {
    test('should allow admin regardless of permission', async () => {
      mockHasRole.mockResolvedValue(true)

      const middleware = allowSelfOrPermission('users:update')
      const c = createMockContext({ id: 1 }, '999')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should allow user accessing own resource', async () => {
      mockHasRole.mockResolvedValue(false)

      const middleware = allowSelfOrPermission('users:update')
      const c = createMockContext({ id: 1 }, '1')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should allow user with permission', async () => {
      mockHasRole.mockResolvedValue(false)
      mockHasPermission.mockResolvedValue(true)

      const middleware = allowSelfOrPermission('users:update')
      const c = createMockContext({ id: 1 }, '999')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should reject user without permission accessing other resource', async () => {
      mockHasRole.mockResolvedValue(false)
      mockHasPermission.mockResolvedValue(false)

      const middleware = allowSelfOrPermission('users:update')
      const c = createMockContext({ id: 1 }, '999')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(403)
    })
  })
})
