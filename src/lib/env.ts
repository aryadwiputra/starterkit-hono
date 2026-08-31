import { z } from 'zod'

/**
 * Environment Variables Schema
 * Penjelasan: Validasi .env vars dengan Zod
 * Throw error jika ada var yang missing atau invalid
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('file:./data.db'),
  SESSION_SECRET: z.string().min(32).default('default-secret-change-in-production'),
})

// Parse and validate
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

// Type export
export type Env = z.infer<typeof envSchema>
