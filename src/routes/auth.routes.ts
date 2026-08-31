import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authService } from '../services/auth.service'
import { authMiddleware, loginRateLimit } from '../middleware'

// ============================================
// PUBLIC AUTH ROUTES (no login required)
// ============================================
const publicAuth = new Hono()

const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
})

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password diperlukan'),
})

publicAuth.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json')
  const result = await authService.register({
    email: body.email,
    password: body.password,
    name: body.name,
  })

  return c.json({
    message: 'Registrasi berhasil',
    data: {
      user: result.user,
      sessionId: result.sessionId,
    },
  }, 201)
})

// Login with rate limiting (5 attempts per 15 min)
publicAuth.post('/login', loginRateLimit, zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')
  const result = await authService.login({
    email: body.email,
    password: body.password,
  })

  return c.json({
    message: 'Login berhasil',
    data: {
      user: result.user,
      sessionId: result.sessionId,
    },
  })
})

// ============================================
// PASSWORD RESET ROUTES
// ============================================

const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token diperlukan'),
  newPassword: z.string().min(8, 'Password minimal 8 karakter'),
})

/**
 * POST /auth/forgot-password
 * Penjelasan: Request password reset link
 */
publicAuth.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json')
  const result = await authService.forgotPassword(email)
  return c.json(result)
})

/**
 * POST /auth/reset-password
 * Penjelasan: Reset password dengan token
 */
publicAuth.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { token, newPassword } = c.req.valid('json')
  const result = await authService.resetPassword({ token, newPassword })
  return c.json(result)
})

// ============================================
// PROTECTED AUTH ROUTES (login required)
// ============================================
const protectedAuth = new Hono()

protectedAuth.use('*', authMiddleware)

protectedAuth.post('/logout', async (c) => {
  const sessionId = c.get('sessionId')
  if (sessionId) {
    await authService.logout(sessionId)
  }
  return c.json({ message: 'Logout berhasil' })
})

protectedAuth.post('/logout-all', async (c) => {
  const user = c.get('user')
  await authService.logoutAllDevices(user.id)
  return c.json({ message: 'Logout dari semua device berhasil' })
})

protectedAuth.get('/me', async (c) => {
  const user = c.get('user')
  return c.json({ data: { user } })
})

export { publicAuth, protectedAuth }
export default publicAuth
