/**
 * Seed Script
 * Penjelasan: Generate initial data untuk development
 *
 * Usage: bun run db:seed
 */

import { db } from '../src/db'
import { users } from '../src/db/schema'
import { passwordService } from '../src/services/password.service'
import { assignRoleToUser } from '../src/lib/rbac'

async function seed() {
  console.log('🌱 Starting seed...')

  // Check if admin already exists
  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'admin@example.com'),
  })

  if (existingAdmin) {
    console.log('⚠️ Admin user already exists, skipping...')
    process.exit(0)
  }

  // Create admin user
  const adminPassword = await passwordService.hash('admin123')
  const adminId = await db.insert(users).values({
    email: 'admin@example.com',
    passwordHash: adminPassword,
    name: 'Admin',
  }).returning({ id: users.id })

  // Assign admin role
  if (adminId[0]?.id) {
    await assignRoleToUser(adminId[0].id, 'admin')
  }

  console.log(`✅ Created admin user (ID: ${adminId[0]?.id})`)
  console.log('   Email: admin@example.com')
  console.log('   Password: admin123')

  // Create sample user
  const userPassword = await passwordService.hash('user123')
  const userId = await db.insert(users).values({
    email: 'user@example.com',
    passwordHash: userPassword,
    name: 'Sample User',
  }).returning({ id: users.id })

  // Assign user role
  if (userId[0]?.id) {
    await assignRoleToUser(userId[0].id, 'user')
  }

  console.log(`✅ Created sample user (ID: ${userId[0]?.id})`)
  console.log('   Email: user@example.com')
  console.log('   Password: user123')

  console.log('\n✨ Seed completed!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
