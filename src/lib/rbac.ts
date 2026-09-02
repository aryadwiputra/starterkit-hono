/**
 * RBAC Library
 * Penjelasan: Helper functions untuk permission checking
 */

import { db, userRoles, rolePermissions, permissions, roles } from '../db'
import { eq, and } from 'drizzle-orm'
import type { Role } from '../db'

/**
 * Check apakah user punya permission tertentu
 */
export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  const result = await db
    .select({ id: permissions.id })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(permissions.name, permissionName)
      )
    )
    .limit(1)

  return result.length > 0
}

/**
 * Get semua permissions yang dimiliki user
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const result = await db
    .select({ name: permissions.name })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId))

  return result.map(r => r.name)
}

/**
 * Check apakah user punya role tertentu
 */
export async function hasRole(userId: number, roleName: string): Promise<boolean> {
  const result = await db
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(roles.name, roleName)
      )
    )
    .limit(1)

  return result.length > 0
}

/**
 * Get semua roles yang dimiliki user
 */
export async function getUserRoles(userId: number): Promise<Role[]> {
  const result = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  return result
}

/**
 * Assign role ke user
 */
export async function assignRoleToUser(userId: number, roleName: string): Promise<void> {
  const role = await db.select().from(roles).where(eq(roles.name, roleName)).get()
  if (!role) {
    throw new Error(`Role '${roleName}' not found`)
  }

  await db.insert(userRoles).values({
    userId,
    roleId: role.id,
  }).onConflictDoNothing()
}

/**
 * Remove role dari user
 */
export async function removeRoleFromUser(userId: number, roleName: string): Promise<void> {
  const role = await db.select().from(roles).where(eq(roles.name, roleName)).get()
  if (!role) {
    return // Role tidak ada, skip
  }

  await db
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, role.id)
      )
    )
}

/**
 * Get permission ID by name
 */
export async function getPermissionId(permissionName: string): Promise<number | null> {
  const perm = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.name, permissionName))
    .get()

  return perm?.id ?? null
}

/**
 * Get role ID by name
 */
export async function getRoleId(roleName: string): Promise<number | null> {
  const role = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName))
    .get()

  return role?.id ?? null
}
