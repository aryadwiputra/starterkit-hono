/**
 * Migration Script: Add RBAC System
 * Usage: bun run scripts/migrate-rbac.ts
 */

import { db } from '../src/db'
import { Database } from 'bun:sqlite'

async function migrate() {
  console.log('🔄 Starting RBAC migration...')

  const sqlite = new Database('./data.db')

  // Check if already migrated
  try {
    const existingRoles = sqlite.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number }
    if (existingRoles.count > 0) {
      console.log('⚠️ RBAC already migrated, skipping...')
      process.exit(0)
    }
  } catch {
    // Tables don't exist yet, continue
  }

  // Create tables using raw SQL
  console.log('📝 Creating tables...')

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL UNIQUE,
      description text,
      resource text NOT NULL,
      action text NOT NULL,
      created_at integer NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions (resource, action);

    CREATE TABLE IF NOT EXISTS roles (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL UNIQUE,
      description text,
      created_at integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id integer NOT NULL,
      permission_id integer NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id integer NOT NULL,
      role_id integer NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

    ALTER TABLE users ADD COLUMN is_active integer DEFAULT 1 NOT NULL;
  `)
  console.log('   ✓ Created tables')

  // Seed roles
  console.log('👥 Creating roles...')
  sqlite.prepare('INSERT OR IGNORE INTO roles (name, description, created_at) VALUES (?, ?, ?)').run('admin', 'Administrator dengan akses penuh', Date.now())
  sqlite.prepare('INSERT OR IGNORE INTO roles (name, description, created_at) VALUES (?, ?, ?)').run('user', 'User biasa dengan akses terbatas', Date.now())
  console.log('   ✓ admin, user')

  // Seed permissions
  console.log('🔐 Creating permissions...')
  const perms = [
    ['users:create', 'Buat user baru', 'users', 'create'],
    ['users:read', 'Lihat semua user', 'users', 'read'],
    ['users:read:own', 'Lihat profil sendiri', 'users', 'read:own'],
    ['users:update', 'Update semua user', 'users', 'update'],
    ['users:update:own', 'Update profil sendiri', 'users', 'update:own'],
    ['users:delete', 'Hapus user', 'users', 'delete'],
    ['users:role:update', 'Ubah role user', 'users', 'role:update'],
    ['posts:create', 'Buat post', 'posts', 'create'],
    ['posts:read', 'Lihat semua post', 'posts', 'read'],
    ['posts:update', 'Update semua post', 'posts', 'update'],
    ['posts:update:own', 'Update post sendiri', 'posts', 'update:own'],
    ['posts:delete', 'Hapus semua post', 'posts', 'delete'],
    ['posts:delete:own', 'Hapus post sendiri', 'posts', 'delete:own'],
    ['settings:read', 'Lihat settings', 'settings', 'read'],
    ['settings:update', 'Update settings', 'settings', 'update'],
  ]

  const insertPerm = sqlite.prepare('INSERT OR IGNORE INTO permissions (name, description, resource, action, created_at) VALUES (?, ?, ?, ?, ?)')
  for (const p of perms) {
    insertPerm.run(...p, Date.now())
  }
  console.log(`   ✓ ${perms.length} permissions`)

  // Assign all permissions to admin
  console.log('👑 Assigning permissions to admin...')
  const adminRole = sqlite.prepare('SELECT id FROM roles WHERE name = ?').get('admin') as { id: number } | undefined
  if (adminRole) {
    const allPerms = sqlite.prepare('SELECT id FROM permissions').all() as { id: number }[]
    const insertRp = sqlite.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
    for (const p of allPerms) {
      insertRp.run(adminRole.id, p.id)
    }
    console.log(`   ✓ Admin: ${allPerms.length} permissions`)
  }

  // Assign limited permissions to user
  console.log('👤 Assigning permissions to user...')
  const userRole = sqlite.prepare('SELECT id FROM roles WHERE name = ?').get('user') as { id: number } | undefined
  const userPermNames = ['users:read:own', 'users:update:own', 'posts:create', 'posts:read', 'posts:update:own', 'posts:delete:own']
  if (userRole) {
    const insertRp = sqlite.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
    for (const name of userPermNames) {
      const p = sqlite.prepare('SELECT id FROM permissions WHERE name = ?').get(name) as { id: number } | undefined
      if (p) {
        insertRp.run(userRole.id, p.id)
      }
    }
    console.log(`   ✓ User: ${userPermNames.length} permissions`)
  }

  // Migrate existing users
  console.log('🔄 Migrating existing users...')
  try {
    const hasRoleColumn = sqlite.prepare("PRAGMA table_info(users)").all().some((col: any) => col.name === 'role')
    if (hasRoleColumn) {
      const usersWithRole = sqlite.prepare('SELECT id, role FROM users WHERE role IS NOT NULL').all() as { id: number; role: string }[]
      const insertUr = sqlite.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')
      for (const u of usersWithRole) {
        const roleName = u.role === 'admin' ? 'admin' : 'user'
        const role = sqlite.prepare('SELECT id FROM roles WHERE name = ?').get(roleName) as { id: number } | undefined
        if (role) {
          insertUr.run(u.id, role.id)
        }
      }
      console.log(`   ✓ Migrated ${usersWithRole.length} users`)
    } else {
      console.log('   ⚠️ No role column found, assigning user role to all users')
      const allUsers = sqlite.prepare('SELECT id FROM users').all() as { id: number }[]
      const userRoleForAll = sqlite.prepare('SELECT id FROM roles WHERE name = ?').get('user') as { id: number } | undefined
      const insertUr = sqlite.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')
      if (userRoleForAll) {
        for (const u of allUsers) {
          insertUr.run(u.id, userRoleForAll.id)
        }
      }
      console.log(`   ✓ Assigned user role to ${allUsers.length} users`)
    }
  } catch (err) {
    console.log('   ⚠️ Migration of existing users skipped')
  }

  sqlite.close()
  console.log('\n✅ RBAC migration complete!')
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
