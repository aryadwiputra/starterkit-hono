/**
 * Migration Script: Add Audit Logs and Files Tables
 * Usage: bun run scripts/migrate-audit-files.ts
 */

import { db } from '../src/db'
import { Database } from 'bun:sqlite'

async function migrate() {
  console.log('🔄 Starting migration...')

  const sqlite = new Database('./data.db')

  // Check if tables already exist
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  const tableNames = tables.map(t => t.name)

  if (tableNames.includes('audit_logs')) {
    console.log('⚠️ audit_logs table already exists, skipping...')
  } else {
    console.log('📝 Creating audit_logs table...')
    sqlite.exec(`
      CREATE TABLE audit_logs (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer,
        action text NOT NULL,
        resource text NOT NULL,
        resource_id text,
        old_value text,
        new_value text,
        ip_address text,
        user_agent text,
        created_at integer NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE set null
      );
      CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
      CREATE INDEX idx_audit_logs_resource ON audit_logs (resource);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
    `)
    console.log('   ✓ audit_logs table created')
  }

  if (tableNames.includes('files')) {
    console.log('⚠️ files table already exists, skipping...')
  } else {
    console.log('📝 Creating files table...')
    sqlite.exec(`
      CREATE TABLE files (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL,
        key text NOT NULL UNIQUE,
        filename text NOT NULL,
        mime_type text NOT NULL,
        size integer NOT NULL,
        created_at integer NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
      );
      CREATE INDEX idx_files_user_id ON files (user_id);
      CREATE INDEX idx_files_key ON files (key);
    `)
    console.log('   ✓ files table created')
  }

  sqlite.close()
  console.log('\n✅ Migration complete!')
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
