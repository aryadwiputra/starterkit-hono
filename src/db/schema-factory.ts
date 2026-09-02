import * as sqliteSchema from './schema.sqlite'
import * as mysqlSchema from './schema.mysql'
import * as pgsqlSchema from './schema.pgsql'

export type Dialect = 'sqlite' | 'mysql' | 'pgsql'

export interface Schema {
  permissions: typeof sqliteSchema.permissions
  permissionsRelations: typeof sqliteSchema.permissionsRelations
  roles: typeof sqliteSchema.roles
  rolesRelations: typeof sqliteSchema.rolesRelations
  rolePermissions: typeof sqliteSchema.rolePermissions
  rolePermissionsRelations: typeof sqliteSchema.rolePermissionsRelations
  userRoles: typeof sqliteSchema.userRoles
  userRolesRelations: typeof sqliteSchema.userRolesRelations
  users: typeof sqliteSchema.users
  usersRelations: typeof sqliteSchema.usersRelations
  sessions: typeof sqliteSchema.sessions
  sessionsRelations: typeof sqliteSchema.sessionsRelations
  passwordResets: typeof sqliteSchema.passwordResets
  auditLogs: typeof sqliteSchema.auditLogs
  files: typeof sqliteSchema.files
  filesRelations: typeof sqliteSchema.filesRelations
}

export function createSchema(dialect: Dialect): Schema {
  if (dialect === 'mysql') return mysqlSchema as unknown as Schema
  if (dialect === 'pgsql') return pgsqlSchema as unknown as Schema
  return sqliteSchema as unknown as Schema
}
