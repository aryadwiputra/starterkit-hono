/**
 * RBAC Seed Script
 * Penjelasan: Seed permissions dan roles untuk RBAC system
 *
 * Usage: bun run scripts/seed-rbac.ts
 */

import { db } from '../src/db'
import { permissions, roles, rolePermissions } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const DEFAULT_PERMISSIONS = [
  // Users permissions
  { name: 'users:create', description: 'Buat user baru', resource: 'users', action: 'create' },
  { name: 'users:read', description: 'Lihat semua user', resource: 'users', action: 'read' },
  { name: 'users:read:own', description: 'Lihat profil sendiri', resource: 'users', action: 'read:own' },
  { name: 'users:update', description: 'Update semua user', resource: 'users', action: 'update' },
  { name: 'users:update:own', description: 'Update profil sendiri', resource: 'users', action: 'update:own' },
  { name: 'users:delete', description: 'Hapus user', resource: 'users', action: 'delete' },
  { name: 'users:role:update', description: 'Ubah role user', resource: 'users', action: 'role:update' },

  // Posts permissions (for future expansion)
  { name: 'posts:create', description: 'Buat post', resource: 'posts', action: 'create' },
  { name: 'posts:read', description: 'Lihat semua post', resource: 'posts', action: 'read' },
  { name: 'posts:update', description: 'Update semua post', resource: 'posts', action: 'update' },
  { name: 'posts:update:own', description: 'Update post sendiri', resource: 'posts', action: 'update:own' },
  { name: 'posts:delete', description: 'Hapus semua post', resource: 'posts', action: 'delete' },
  { name: 'posts:delete:own', description: 'Hapus post sendiri', resource: 'posts', action: 'delete:own' },

  // Settings permissions
  { name: 'settings:read', description: 'Lihat settings', resource: 'settings', action: 'read' },
  { name: 'settings:update', description: 'Update settings', resource: 'settings', action: 'update' },

  // Files permissions
  { name: 'files:create', description: 'Upload file', resource: 'files', action: 'create' },
  { name: 'files:read', description: 'Lihat file', resource: 'files', action: 'read' },
  { name: 'files:delete', description: 'Hapus file', resource: 'files', action: 'delete' },
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

async function seedRbac() {
  console.log('🔐 Seeding RBAC data...')

  // 1. Seed permissions
  console.log('\n📝 Creating permissions...')
  for (const perm of DEFAULT_PERMISSIONS) {
    await db.insert(permissions).values(perm).onConflictDoNothing()
    console.log(`   ✓ ${perm.name}`)
  }
  console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} permissions`)

  // 2. Seed roles
  console.log('\n👥 Creating roles...')
  for (const role of DEFAULT_ROLES) {
    await db.insert(roles).values(role).onConflictDoNothing()
    console.log(`   ✓ ${role.name}`)
  }
  console.log(`✅ Created ${DEFAULT_ROLES.length} roles`)

  // 3. Assign all permissions to admin
  console.log('\n🔑 Assigning permissions to roles...')
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
    console.log(`   ✓ admin: ${DEFAULT_PERMISSIONS.length} permissions`)
  }

  // 4. Assign limited permissions to user
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
    console.log(`   ✓ user: ${USER_PERMISSIONS.length} permissions`)
  }

  console.log('\n✨ RBAC seeding complete!')
}

seedRbac().catch((err) => {
  console.error('❌ RBAC seed failed:', err)
  process.exit(1)
})
