import { z } from 'zod'

/**
 * Environment Variables Schema
 *
 * Validates semua env vars saat app startup.
 * Throw error jelas jika ada yang missing atau invalid.
 */

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_DIR: z.string().default('logs'),

  // Database
  DB_CONNECTION: z.enum(['mysql', 'pgsql', 'sqlite']).default('sqlite'),
  DATABASE_URL: z.string().default('file:./data.db'),

  // Session
  SESSION_EXPIRY_DAYS: z.coerce.number().min(1).max(365).default(7),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // S3 Storage (optional)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(), // For MinIO, etc.
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),

  // Redis (optional - required for queues)
  REDIS_URL: z.string().optional(),

  // Resend Email (optional)
  RESEND_API_KEY: z.string().optional(),
})

/**
 * Parse dan validate env vars.
 * Throw descriptive error jika invalid.
 */
function parseEnv(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        const path = issue.path.join('.')
        return `  - ${path}: ${issue.message}`
      }).join('\n')

      console.error(`
❌ Environment validation failed:

${issues}

Please check your .env file or environment variables.
`)
      process.exit(1)
    }
    throw error
  }
}

export const env = parseEnv()

/**
 * Helper untuk cek environment
 */
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'

// Type export
export type Env = z.infer<typeof envSchema>
