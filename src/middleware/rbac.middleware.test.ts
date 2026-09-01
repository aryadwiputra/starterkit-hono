import { describe, test, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { requireRole, requireOwnerOrAdmin, allowSelfOrAdmin } from './rbac.middleware'

describe('RBAC Middleware', () => {
  let app: Hono

  const mockUser = { id: 1, email: 'test@test.com', role: 'user' as const }
  const mockAdmin = { id: 2, email: 'admin@test.com', role: 'admin' as const }

  beforeEach(() => {
    app = new Hono()
  })

  const createMockContext = (user: any, paramId?: string, ownerId?: number) => {
    const c: any = {
      _getValues: { user, ownerId },
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

  describe('requireRole', () => {
    test('should allow admin to access admin route', async () => {
      const middleware = requireRole('admin')
      const c = createMockContext(mockAdmin)
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should reject user from admin route', async () => {
      const middleware = requireRole('admin')
      const c = createMockContext(mockUser)
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(403)
    })

    test('should reject request without user', async () => {
      const middleware = requireRole('admin')
      const c = createMockContext(undefined)
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(401)
    })
  })

  describe('requireOwnerOrAdmin', () => {
    test('should allow admin regardless of owner', async () => {
      const middleware = requireOwnerOrAdmin()
      const c = createMockContext(mockAdmin, undefined, 999)
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should allow owner to access resource', async () => {
      const middleware = requireOwnerOrAdmin()
      const c = createMockContext(mockUser, undefined, 1)
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should reject non-owner', async () => {
      const middleware = requireOwnerOrAdmin()
      // User id=1 but ownerId=2
      const c = createMockContext(mockUser, undefined, 2)
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(403)
    })
  })

  describe('allowSelfOrAdmin', () => {
    test('should allow admin to access any resource', async () => {
      const middleware = allowSelfOrAdmin()
      const c = createMockContext(mockAdmin, '999')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should allow user to access own resource', async () => {
      const middleware = allowSelfOrAdmin()
      const c = createMockContext(mockUser, '1')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    test('should reject user accessing other resource', async () => {
      const middleware = allowSelfOrAdmin()
      const c = createMockContext(mockUser, '2')
      let nextCalled = false

      await middleware(c as any, async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(c._status).toBe(403)
    })
  })
})
