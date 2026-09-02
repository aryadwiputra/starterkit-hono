import type { Config } from 'drizzle-kit'

const dialect = process.env.DB_CONNECTION || 'sqlite'

const dbUrl =
  process.env.DATABASE_URL ||
  (dialect === 'sqlite' ? 'file:./data.db' : '')

const schema =
  dialect === 'mysql'
    ? './src/db/schema.mysql.ts'
    : dialect === 'pgsql'
      ? './src/db/schema.pgsql.ts'
      : './src/db/schema.sqlite.ts'

export default {
  schema,
  out: './drizzle',
  dialect: dialect as 'mysql' | 'pgsql' | 'sqlite',
  dbCredentials: {
    url: dbUrl,
  },
} satisfies Config
