# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bun + Hono backend with session-based authentication, RBAC, rate limiting, and password reset. Production-ready starter kit for secure APIs.

## Commands

```bash
bun install          # Install dependencies
bun run dev         # Run with hot reload (port 3000)
bun run start       # Run without hot reload
bun test            # Run tests
bun run db:push     # Push schema to database (dev)
bun run db:studio   # Open Drizzle Studio
```

## Architecture

```
src/
├── db/
│   ├── schema.ts          # Drizzle schema (users, sessions, password_resets)
│   └── index.ts           # DB connection + repositories
├── services/
│   ├── auth.service.ts    # Login, register, logout, password reset
│   ├── user.service.ts    # User CRUD + profile management
│   ├── password.service.ts # Password hashing (bcrypt)
│   └── email.service.ts   # Email sending (password reset)
├── middleware/
│   ├── auth.middleware.ts      # Session validation
│   ├── rbac.middleware.ts      # Role-based access control
│   ├── error.middleware.ts     # Global error handler
│   ├── rate-limit.ts          # Rate limiting
│   ├── request-id.ts          # Request ID tracing
│   └── request-logger.ts      # Request/response logging
├── routes/
│   ├── auth.routes.ts     # Auth endpoints
│   └── user.routes.ts     # User CRUD endpoints
├── lib/
│   ├── env.ts             # Environment validation
│   └── cleanup.ts         # Session cleanup scheduler
├── docs/
│   └── openapi.ts         # OpenAPI/Swagger documentation
└── index.ts               # App entry, global middleware

tests/
├── unit/
│   ├── services/          # Service unit tests
│   └── middleware/        # Middleware unit tests
```

## Layer Flow

```
Request → Rate Limit → Auth → RBAC → Handler → Service → Repository → Database
                   ↓         ↓        ↓
              (429 error)  (401)    (403)
```

## Key Patterns

- **Session-based auth** — stored in SQLite (not JWT)
- **Repository pattern** — data access layer
- **Service layer** — business logic, no HTTP concerns
- **RBAC** — `user` and `admin` roles
- **Rate limiting** — in-memory, per-IP
- **Zod validation** — request body/query validation
- **Environment validation** — type-safe config from `.env`

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
