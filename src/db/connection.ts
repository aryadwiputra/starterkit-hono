import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import type { Schema } from './schema-factory'
import type { Dialect } from './schema-factory'

export type DatabaseInstance = ReturnType<typeof drizzle>

export interface ConnectionResult {
  db: DatabaseInstance
  healthCheck: () => Promise<void>
}

export function createConnection(
  dialect: Dialect,
  url: string,
  schema: Schema,
): ConnectionResult {
  if (dialect === 'mysql') {
    const pool = mysql.createPool(url)
    const db = drizzle(pool, { schema })

    return {
      db,
      healthCheck: async () => {
        const connection = await pool.getConnection()
        await connection.ping()
        connection.release()
      },
    }
  }

  if (dialect === 'pgsql') {
    const client = postgres(url)
    const db = drizzlePg(client, { schema })

    return {
      db,
      healthCheck: async () => {
        await client`SELECT 1`
      },
    }
  }

  const sqlite = new Database(url.replace('file:', ''))
  const db = drizzleSqlite(sqlite, { schema })

  return {
    db,
    healthCheck: () => {
      sqlite.query('SELECT 1').all()
    },
  }
}

export function detectDialect(url: string): Dialect {
  if (url.startsWith('mysql://') || url.startsWith('mysql://')) return 'mysql'
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'pgsql'
  return 'sqlite'
}
