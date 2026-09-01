# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bun + Hono backend with session-based authentication, RBAC, structured logging, job queues, and production-ready infrastructure. Starter kit for secure APIs.

## Commands

```bash
bun install            # Install dependencies
bun run dev           # Run API server with hot reload (port 3000)
bun run start         # Run API server without hot reload
bun run worker        # Run worker process (job queue)
bun run dev:all       # Run API + Worker together
bun test              # Run tests
bun run db:generate   # Generate migrations
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema to database (dev)
bun run db:studio     # Open Drizzle Studio
bun run db:seed       # Seed initial data
```

## Architecture

```
starterkit-hono/
├── src/                    # API Server
│   ├── db/                 # Database schema + repositories
│   ├── lib/               # Utilities (logger, redis, queue, etc.)
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware (auth, rbac, etc.)
│   ├── routes/            # API routes
│   └── index.ts          # Entry point
├── worker/                  # Worker Process (separate)
│   ├── index.ts          # Worker entry
│   └── jobs/             # Job processors
├── shared/                  # Shared types
│   └── jobs.ts           # Job type definitions
└── scripts/               # Migration + seed scripts
```

## Core Features

### Authentication
- Session-based auth (stored in SQLite)
- Password hashing with bcrypt
- Rate limiting on login

### RBAC (Role-Based Access Control)
- Permissions: `users:create`, `users:read`, `posts:update`, etc.
- Roles: `admin` (all permissions), `user` (limited permissions)
- Junction tables: `role_permissions`, `user_roles`

### Logging
- Pino structured logging
- JSON format (production) / Pretty print (development)
- Request correlation IDs
- Log levels: trace, debug, info, warn, error, fatal

### Health Checks
- `GET /health` - Full health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (checks DB)

### Graceful Shutdown
- Handles SIGTERM, SIGINT
- Cleanup registered functions
- Force exit after timeout

### Audit Trail
- Track semua mutation (create, update, delete)
- Query via API: `GET /audit`

### File Storage (S3)
- Upload: `POST /upload`
- List: `GET /upload`
- Download: `GET /upload/:id/url` (presigned URL)
- Delete: `DELETE /upload/:id`

### Job Queue (BullMQ + Redis)
- Email queue
- Broadcast queue
- Worker process separate dari API
- Retry dengan exponential backoff

## Environment Variables

### Required for Queues

| Variable | Required | Description |
|----------|----------|-------------|
| REDIS_URL | Yes | Redis connection string |

### Optional

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment |
| PORT | No | 3000 | Server port |
| LOG_LEVEL | No | info | Log level |
| DATABASE_URL | No | file:./data.db | Database path |
| SESSION_EXPIRY_DAYS | No | 7 | Session expiry |
| CORS_ORIGIN | No | localhost:3000 | Allowed origins |
| S3_BUCKET | No | - | S3 bucket name |
| S3_REGION | No | us-east-1 | S3 region |
| RESEND_API_KEY | No | - | Resend API key for emails |

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | ❌ | Register new user |
| POST | /auth/login | ❌ | Login (rate limited: 5/15min) |
| POST | /auth/forgot-password | ❌ | Request password reset |
| POST | /auth/reset-password | ❌ | Reset password with token |
| POST | /auth/logout | ✅ | Logout |
| POST | /auth/logout-all | ✅ | Logout all devices |
| GET | /auth/me | ✅ | Get current user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | ✅ | List all users (admin) |
| GET | /api/users/:id | ✅ | Get user profile |
| PATCH | /api/users/:id | ✅ | Update profile |
| DELETE | /api/users/:id | ✅ | Delete user (admin) |
| PATCH | /api/users/:id/role | ✅ | Change role (admin) |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /admin/broadcast | ✅ Admin | Send broadcast email |

### Files

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /upload | ✅ | Upload file |
| GET | /upload | ✅ | List user files |
| GET | /upload/:id/url | ✅ | Get presigned URL |
| DELETE | /upload/:id | ✅ | Delete file |

### Audit

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /audit | ✅ Admin | List audit logs |
| GET | /audit/:id | ✅ Admin | Get audit log |
| GET | /audit/resource/:resource/:id | ✅ Admin | Get resource history |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | ❌ | Full health status |
| GET | /health/live | ❌ | Liveness probe |
| GET | /health/ready | ❌ | Readiness probe |

## Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- Session expires in 7 days
- Password reset token expires in 1 hour
- Login rate limited: 5 attempts per 15 minutes
- All devices logged out on password reset

## Notes

- Use `Authorization: Bearer <sessionId>` header for authenticated requests
- Copy `.env.example` to `.env` for configuration
- Run `bun test` to execute unit tests
- Redis required for job queues (workers)
- Worker runs separately: `bun run worker`
