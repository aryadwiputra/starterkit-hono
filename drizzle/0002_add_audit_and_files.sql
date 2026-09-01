-- ============================================================================
-- Add Audit Logs and Files Tables
-- ============================================================================

-- Create audit_logs table
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`resource` text NOT NULL,
	`resource_id` text,
	`old_value` text,
	`new_value` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_id` ON `audit_logs` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_resource` ON `audit_logs` (`resource`);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);

-- Create files table
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL UNIQUE,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_files_user_id` ON `files` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_files_key` ON `files` (`key`);

-- ============================================================================
-- Seed New Permissions
-- ============================================================================

-- Insert files permissions (will be inserted by seed-rbac.ts)
-- Permissions: files:create, files:read, files:delete
