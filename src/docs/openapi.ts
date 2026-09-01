import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { swaggerUI } from '@hono/swagger-ui'

/**
 * OPENAPI SPEC
 * API documentation for Hono Starter Kit
 */

export const openapi = new OpenAPIHono()

// Register OpenAPI middleware
openapi.use('/docs/*', swaggerUI({ url: '/api/spec' }))

// ============================================
// AUTH SCHEMAS
// ============================================

export const RegisterSchema = z.object({
  email: z.string().email().openapi({ example: 'user@example.com' }),
  password: z.string().min(8).openapi({ example: 'password123' }),
  name: z.string().min(2).openapi({ example: 'John Doe' }),
})

export const LoginSchema = z.object({
  email: z.string().email().openapi({ example: 'user@example.com' }),
  password: z.string().openapi({ example: 'password123' }),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email().openapi({ example: 'user@example.com' }),
})

export const ResetPasswordSchema = z.object({
  token: z.string().openapi({ example: 'reset-token-here' }),
  newPassword: z.string().min(8).openapi({ example: 'newpassword123' }),
})

export const UserSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  name: z.string().openapi({ example: 'John Doe' }),
  role: z.enum(['user', 'admin']).openapi({ example: 'user' }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
})

export const AuthResponseSchema = z.object({
  message: z.string().openapi({ example: 'Success' }),
  data: z.object({
    user: UserSchema,
    sessionId: z.string().openapi({ example: 'session-id-here' }),
  }),
})

export const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'Error message' }),
})

// ============================================
// AUTH ROUTES
// ============================================

openapi.post(
  '/auth/register',
  {
    tags: ['Auth'],
    summary: 'Register new user',
    description: 'Create a new user account and returns session token',
    responses: {
      201: { description: 'User created successfully', content: { 'application/json': { schema: AuthResponseSchema } } },
      400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
      409: { description: 'Email already exists', content: { 'application/json': { schema: ErrorSchema } } },
    },
  },
  openapi.validator('json', RegisterSchema),
  async (c) => {
    // Handler akan di-override di app.ts dengan handler asli
    return c.json({ message: 'Register endpoint' })
  }
)

openapi.post(
  '/auth/login',
  {
    tags: ['Auth'],
    summary: 'Login user',
    description: 'Authenticate user and returns session token. Rate limited: 5 attempts per 15 minutes.',
    responses: {
      200: { description: 'Login successful', content: { 'application/json': { schema: AuthResponseSchema } } },
      401: { description: 'Invalid credentials', content: { 'application/json': { schema: ErrorSchema } } },
      429: { description: 'Too many requests', content: { 'application/json': { schema: ErrorSchema } } },
    },
  },
  openapi.validator('json', LoginSchema),
  async (c) => {
    return c.json({ message: 'Login endpoint' })
  }
)

openapi.post(
  '/auth/forgot-password',
  {
    tags: ['Auth'],
    summary: 'Request password reset',
    description: 'Request a password reset email. Always returns success for security.',
    responses: {
      200: { description: 'Reset email sent if account exists' },
    },
  },
  openapi.validator('json', ForgotPasswordSchema),
  async (c) => {
    return c.json({ message: 'If email exists, reset link will be sent' })
  }
)

openapi.post(
  '/auth/reset-password',
  {
    tags: ['Auth'],
    summary: 'Reset password',
    description: 'Reset password using token from email',
    responses: {
      200: { description: 'Password reset successful' },
      400: { description: 'Invalid token or weak password' },
    },
  },
  openapi.validator('json', ResetPasswordSchema),
  async (c) => {
    return c.json({ message: 'Password reset successful' })
  }
)

openapi.post(
  '/auth/logout',
  {
    tags: ['Auth'],
    summary: 'Logout',
    description: 'Logout current session',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Logout successful' },
      401: { description: 'Unauthorized' },
    },
  },
  async (c) => {
    return c.json({ message: 'Logout successful' })
  }
)

openapi.post(
  '/auth/logout-all',
  {
    tags: ['Auth'],
    summary: 'Logout all devices',
    description: 'Logout from all devices',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'All sessions terminated' },
      401: { description: 'Unauthorized' },
    },
  },
  async (c) => {
    return c.json({ message: 'All devices logged out' })
  }
)

openapi.get(
  '/auth/me',
  {
    tags: ['Auth'],
    summary: 'Get current user',
    description: 'Get authenticated user profile',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Current user data' },
      401: { description: 'Unauthorized' },
    },
  },
  async (c) => {
    return c.json({ data: { user: UserSchema.parse({}) } })
  }
)

// ============================================
// USER ROUTES
// ============================================

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
})

const ChangeRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
})

openapi.get(
  '/api/users',
  {
    tags: ['Users'],
    summary: 'List all users',
    description: 'Get all users (admin only)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'List of users' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden - admin only' },
    },
  },
  async (c) => {
    return c.json({ data: { users: [] } })
  }
)

openapi.get(
  '/api/users/:id',
  {
    tags: ['Users'],
    summary: 'Get user by ID',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'User data' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'User not found' },
    },
  },
  async (c) => {
    return c.json({ data: { user: UserSchema.parse({}) } })
  }
)

openapi.patch(
  '/api/users/:id',
  {
    tags: ['Users'],
    summary: 'Update user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'User updated' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
    },
  },
  openapi.validator('json', UpdateUserSchema),
  async (c) => {
    return c.json({ message: 'User updated' })
  }
)

openapi.delete(
  '/api/users/:id',
  {
    tags: ['Users'],
    summary: 'Delete user',
    description: 'Delete user (admin only)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'User deleted' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden - admin only' },
    },
  },
  async (c) => {
    return c.json({ message: 'User deleted' })
  }
)

openapi.patch(
  '/api/users/:id/role',
  {
    tags: ['Users'],
    summary: 'Change user role',
    description: 'Change user role (admin only)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Role changed' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden - admin only' },
    },
  },
  openapi.validator('json', ChangeRoleSchema),
  async (c) => {
    return c.json({ message: 'Role changed' })
  }
)

// ============================================
// HEALTH CHECK
// ============================================

const HealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string().datetime(),
  db: z.enum(['connected', 'disconnected']),
})

openapi.get(
  '/health',
  {
    tags: ['Health'],
    summary: 'Health check',
    description: 'Check API and database health',
    responses: {
      200: { description: 'API healthy', content: { 'application/json': { schema: HealthSchema } } },
      503: { description: 'API degraded', content: { 'application/json': { schema: HealthSchema } } },
    },
  },
  async (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
  }
)

// OpenAPI spec endpoint
openapi.doc('/spec', {
  openapi: '3.0.0',
  info: {
    title: 'Hono Starter Kit API',
    version: '1.0.0',
    description: 'Production-ready Bun + Hono backend with session-based authentication, RBAC, rate limiting, and password reset.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Session ID',
      },
    },
  },
})
