import { Context, Next } from 'hono'
import { ZodError } from 'zod'

/**
 * ERROR HANDLING MIDDLEWARE
 * Penjelasan: Catch semua error yang terjadi di route
 *           Format response error jadi JSON konsisten
 *
 * Pattern:
 * - ZodError -> 400 Bad Request
 * - Custom Error dengan statusCode -> sesuai code
 * - Unknown Error -> 500 Internal Server Error
 */
export const errorHandler = async (err: Error, c: Context, next: Next) => {
  // Case 1: Validation Error dari Zod
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation Error',
        details: err.errors.map((e) => ({
          // path: ["body", "email"]
          path: e.path.join('.'),
          // "Invalid email format"
          message: e.message,
        })),
      },
      400
    )
  }

  // Case 2: Custom Error dengan statusCode
  // Pattern: throw new Error('message', { cause: 400 })
  if (err.message && typeof (err as any).cause === 'number') {
    const statusCode = (err as any).cause
    return c.json({ error: err.message }, statusCode)
  }

  // Case 3: Known business logic errors
  // Map error message ke HTTP status
  const knownErrors: Record<string, { status: number; message: string }> = {
    'Email sudah terdaftar': { status: 409, message: 'Email sudah digunakan' },
    'Email atau password salah': { status: 401, message: 'Email atau password salah' },
    'User tidak ditemukan': { status: 404, message: 'User tidak ditemukan' },
    'Tidak punya akses': { status: 403, message: 'Tidak punya akses' },
    'Token invalid atau expired': { status: 401, message: 'Silakan login ulang' },
  }

  const knownError = knownErrors[err.message]
  if (knownError) {
    return c.json({ error: knownError.message }, knownError.status)
  }

  // Case 4: Unknown Error
  // Log untuk debugging, return generic message ke client
  console.error('Unhandled error:', err)

  return c.json({ error: 'Internal Server Error' }, 500)
}

/**
 * HELPER: Throw HTTP Error dengan status code
 * Usage: throw httpError('Not Found', 404)
 */
export const httpError = (message: string, statusCode: number) => {
  const error = new Error(message)
  ;(error as any).cause = statusCode
  return error
}
