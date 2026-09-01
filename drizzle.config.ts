import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit Config
 * Penjelasan: Konfigurasi untuk database migrations
 */
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./data.db',
  },
} satisfies Config
