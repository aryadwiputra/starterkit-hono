# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bun + Hono backend with session-based authentication, RBAC, structured logging, and production-ready infrastructure. Starter kit for secure APIs.

## Commands

```bash
bun install            # Install dependencies
bun run dev           # Run with hot reload (port 3000)
bun run start         # Run without hot reload
bun test              # Run tests
bun run db:generate   # Generate migrations
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema to database (dev)
bun run db:studio     # Open Drizzle Studio
bun run db:seed       # Seed initial data
```

## Architecture

```
src/
├── db/
│   ├── schema.ts          # Drizzle schema (users, sessions, permissions, roles)
│   └── index.ts           # DB connection + repositories
├── lib/
│   ├── logger.ts          # Pino structured logging
│   ├── env.ts             # Zod environment validation
│   └── shutdown.ts        # Graceful shutdown handler
├── services/
│   ├── auth.service.ts    # Login, register, logout, password reset
│   ├── user.service.ts     # User CRUD + profile management
│   ├── password.service.ts # Password hashing (bcrypt)
│   └── email.service.ts    # Email sending (password reset)
├── middleware/
│   ├── auth.middleware.ts      # Session validation
│   ├── rbac.middleware.ts      # Permission-based access control
│   ├── error.middleware.ts    # Global error handler
│   ├── rate-limit.ts           # Rate limiting
│   ├── request-id.ts           # Request ID tracing
│   └── request-logger.ts       # Structured request logging
├── routes/
│   ├── auth.routes.ts     # Auth endpoints
│   ├── user.routes.ts     # User CRUD endpoints
│   └── health.routes.ts   # Health check endpoints
└── index.ts               # App entry, global middleware

scripts/
├── seed.ts               # Seed initial data
└── migrate-rbac.ts       # RBAC migration

drizzle/
└── *.sql                 # Database migrations
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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment |
| PORT | No | 3000 | Server port |
| LOG_LEVEL | No | info | Log level |
| DATABASE_URL | No | file:./data.db | Database path |
| SESSION_EXPIRY_DAYS | No | 7 | Session expiry |
| CORS_ORIGIN | No | localhost:3000 | Allowed origins |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | ❌ | Register new user |
| POST | /auth/login | ❌ | Login (rate limited: 5/15min) |
| POST | /auth/forgot-password | ❌ | Request password reset |
| POST | /auth/reset-password | ❌ | Reset password with token |
| POST | /auth/logout | ✅ | Logout |
| POST | /auth/logout-all | ✅ | Logout all devices |
| GET | /auth/me | ✅ | Get current user |
| GET | /api/users | ✅ | List all users (admin only) |
| GET | /api/users/:id | ✅ | Get user profile |
| PATCH | /api/users/:id | ✅ | Update profile |
| DELETE | /api/users/:id | ✅ | Delete user (admin only) |
| PATCH | /api/users/:id/role | ✅ | Change role (admin only) |
| GET | /health | ✅ | Health check |
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
