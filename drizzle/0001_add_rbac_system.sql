-- ============================================================================
-- RBAC System Migration
-- Tables: permissions, roles, role_permissions, user_roles
-- Modify: users (add is_active, remove role column)
-- ============================================================================

-- Create permissions table
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`resource` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);
--> statement-breakpoint
CREATE INDEX `idx_permissions_resource_action` ON `permissions` (`resource`, `action`);

-- Create roles table
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);

-- Create role_permissions junction table
CREATE TABLE `role_permissions` (
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_role_permissions_role_id` ON `role_permissions` (`role_id`);
--> statement-breakpoint
CREATE INDEX `idx_role_permissions_permission_id` ON `role_permissions` (`permission_id`);

-- Create user_roles junction table
CREATE TABLE `user_roles` (
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_roles_user_id` ON `user_roles` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_roles_role_id` ON `user_roles` (`role_id`);

-- Add is_active column to users
ALTER TABLE `users` ADD COLUMN `is_active` integer DEFAULT 1 NOT NULL;

-- ============================================================================
-- Seed Data
-- ============================================================================

-- Insert default roles
INSERT INTO `roles` (`name`, `description`, `created_at`) VALUES
	('admin', 'Administrator dengan akses penuh', strftime('%s', 'now') * 1000),
	('user', 'User biasa dengan akses terbatas', strftime('%s', 'now') * 1000);

-- Insert default permissions
INSERT INTO `permissions` (`name`, `description`, `resource`, `action`, `created_at`) VALUES
	('users:create', 'Buat user baru', 'users', 'create', strftime('%s', 'now') * 1000),
	('users:read', 'Lihat semua user', 'users', 'read', strftime('%s', 'now') * 1000),
	('users:read:own', 'Lihat profil sendiri', 'users', 'read:own', strftime('%s', 'now') * 1000),
	('users:update', 'Update semua user', 'users', 'update', strftime('%s', 'now') * 1000),
	('users:update:own', 'Update profil sendiri', 'users', 'update:own', strftime('%s', 'now') * 1000),
	('users:delete', 'Hapus user', 'users', 'delete', strftime('%s', 'now') * 1000),
	('users:role:update', 'Ubah role user', 'users', 'role:update', strftime('%s', 'now') * 1000),
	('posts:create', 'Buat post', 'posts', 'create', strftime('%s', 'now') * 1000),
	('posts:read', 'Lihat semua post', 'posts', 'read', strftime('%s', 'now') * 1000),
	('posts:update', 'Update semua post', 'posts', 'update', strftime('%s', 'now') * 1000),
	('posts:update:own', 'Update post sendiri', 'posts', 'update:own', strftime('%s', 'now') * 1000),
	('posts:delete', 'Hapus semua post', 'posts', 'delete', strftime('%s', 'now') * 1000),
	('posts:delete:own', 'Hapus post sendiri', 'posts', 'delete:own', strftime('%s', 'now') * 1000),
	('settings:read', 'Lihat settings', 'settings', 'read', strftime('%s', 'now') * 1000),
	('settings:update', 'Update settings', 'settings', 'update', strftime('%s', 'now') * 1000);

-- Assign all permissions to admin role
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r, `permissions` p WHERE r.name = 'admin';

-- Assign limited permissions to user role
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r, `permissions` p
WHERE r.name = 'user'
	AND p.name IN (
		'users:read:own',
		'users:update:own',
		'posts:create',
		'posts:read',
		'posts:update:own',
		'posts:delete:own'
	);

-- Migrate existing users to new RBAC system
INSERT INTO `user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id FROM `users` u, `roles` r
WHERE u.role = 'admin' AND r.name = 'admin';

INSERT INTO `user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id FROM `users` u, `roles` r
WHERE u.role = 'user' AND r.name = 'user';

-- Remove role column from users (run after verification)
-- ALTER TABLE `users` DROP COLUMN `role`;
