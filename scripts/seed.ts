/**
 * Seed Script
 * Usage: bun run db:seed
 */

import { db, users } from '../src/db'
import { passwordService } from '../src/services/password.service'
import { seedRbac } from './seed-rbac'

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    await db.query[tableName as keyof typeof db.query].findFirst?.()
    return true
  } catch {
    return false
  }
}

async function seed() {
  console.log('Starting seed...')

  const tableExists = await checkTableExists('users')
  if (!tableExists) {
    console.error(
      '❌ Table "users" not found. Run `bun run db:push` first to create the schema.',
    )
    process.exit(1)
  }

  console.log('Seeding RBAC data...')
  await seedRbac()

  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'admin@example.com'),
  })

  if (!existingAdmin) {
    const adminPassword = await passwordService.hash('admin123')
    await db.insert(users).values({
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'Admin',
    })
    const admin = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, 'admin@example.com'),
    })
    if (admin?.id) {
      const { assignRoleToUser } = await import('../src/lib/rbac')
      await assignRoleToUser(admin.id, 'admin')
      console.log(`Created admin user (ID: ${admin.id})`)
      console.log('  Email: admin@example.com')
      console.log('  Password: admin123')
    }
  } else {
    console.log('Admin user already exists, skipping.')
  }

  const existingUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'user@example.com'),
  })

  if (!existingUser) {
    const userPassword = await passwordService.hash('user123')
    await db.insert(users).values({
      email: 'user@example.com',
      passwordHash: userPassword,
      name: 'Sample User',
    })
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, 'user@example.com'),
    })
    if (user?.id) {
      const { assignRoleToUser } = await import('../src/lib/rbac')
      await assignRoleToUser(user.id, 'user')
      console.log(`Created sample user (ID: ${user.id})`)
      console.log('  Email: user@example.com')
      console.log('  Password: user123')
    }
  } else {
    console.log('Sample user already exists, skipping.')
  }

  console.log('Seed completed.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
