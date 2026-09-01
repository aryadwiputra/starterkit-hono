import { Context, Next } from 'hono'

/**
 * MIDDLEWARE REQUEST ID
 * Penjelasan: Generate unique ID per request untuk tracing
 */
export const requestIdMiddleware = async (c: Context, next: Next) => {
  // Cek apakah request ID ada di header, kalau tidak generate baru
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID()

  // Simpan ke context
  c.set('requestId', requestId)

  // Tambahkan ke response header
  c.res.headers.set('X-Request-ID', requestId)

  await next()
}
