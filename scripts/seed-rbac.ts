/**
 * RBAC Seed Script
 * Usage: bun run scripts/seed-rbac.ts
 * Or import seedRbac() from another script.
 */

import { db, permissions, roles, rolePermissions } from '../src/db'
import { eq } from 'drizzle-orm'

const DEFAULT_PERMISSIONS = [
  { name: 'users:create', description: 'Buat user baru', resource: 'users', action: 'create' },
  { name: 'users:read', description: 'Lihat semua user', resource: 'users', action: 'read' },
  { name: 'users:read:own', description: 'Lihat profil sendiri', resource: 'users', action: 'read:own' },
  { name: 'users:update', description: 'Update semua user', resource: 'users', action: 'update' },
  { name: 'users:update:own', description: 'Update profil sendiri', resource: 'users', action: 'update:own' },
  { name: 'users:delete', description: 'Hapus user', resource: 'users', action: 'delete' },
  { name: 'users:role:update', description: 'Ubah role user', resource: 'users', action: 'role:update' },
  { name: 'posts:create', description: 'Buat post', resource: 'posts', action: 'create' },
  { name: 'posts:read', description: 'Lihat semua post', resource: 'posts', action: 'read' },
  { name: 'posts:update', description: 'Update semua post', resource: 'posts', action: 'update' },
  { name: 'posts:update:own', description: 'Update post sendiri', resource: 'posts', action: 'update:own' },
  { name: 'posts:delete', description: 'Hapus semua post', resource: 'posts', action: 'delete' },
  { name: 'posts:delete:own', description: 'Hapus post sendiri', resource: 'posts', action: 'delete:own' },
  { name: 'settings:read', description: 'Vihat settings', resource: 'settings', action: 'read' },
  { name: 'settings:update', description: 'Update settings', resource: 'settings', action: 'update' },
  { name: 'files:create', description: 'Upload file', resource: 'files', action: 'create' },
  { name: 'files:read', description: 'Lihat file', resource: 'files', action: 'read' },
  { name: 'files:delete', description: 'Hapus file', resource: 'files', action: 'delete' },
  { name: 'broadcast:send', description: 'Kirim broadcast', resource: 'broadcast', action: 'send' },
]

const DEFAULT_ROLES = [
  { name: 'admin', description: 'Administrator dengan akses penuh' },
  { name: 'user', description: 'User biasa dengan akses terbatas' },
]

const USER_PERMISSIONS = [
  'users:read:own',
  'users:update:own',
  'posts:create',
  'posts:read',
  'posts:update:own',
  'posts:delete:own',
  'files:create',
  'files:read',
  'files:delete',
]

export async function seedRbac(): Promise<void> {
  for (const perm of DEFAULT_PERMISSIONS) {
    await db.insert(permissions).values(perm).onConflictDoNothing()
  }

  for (const role of DEFAULT_ROLES) {
    await db.insert(roles).values(role).onConflictDoNothing()
  }

  const adminRole = await db.select().from(roles).where(eq(roles.name, 'admin')).get()
  if (adminRole) {
    for (const perm of DEFAULT_PERMISSIONS) {
      const permRecord = await db.select().from(permissions).where(eq(permissions.name, perm.name)).get()
      if (permRecord) {
        await db.insert(rolePermissions).values({
          roleId: adminRole.id,
          permissionId: permRecord.id,
        }).onConflictDoNothing()
      }
    }
  }

  const userRole = await db.select().from(roles).where(eq(roles.name, 'user')).get()
  if (userRole) {
    for (const permName of USER_PERMISSIONS) {
      const permRecord = await db.select().from(permissions).where(eq(permissions.name, permName)).get()
      if (permRecord) {
        await db.insert(rolePermissions).values({
          roleId: userRole.id,
          permissionId: permRecord.id,
        }).onConflictDoNothing()
      }
    }
  }
}

if (import.meta.main) {
  seedRbac()
    .then(() => {
      console.log('RBAC seeding complete.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('RBAC seed failed:', err)
      process.exit(1)
    })
}
