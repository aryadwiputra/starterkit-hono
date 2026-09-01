# Hono Starter Kit

Production-ready Bun + Hono backend with session-based authentication, RBAC, rate limiting, and password reset.

## Features

- Session-based authentication (not JWT)
- Role-based access control (user, admin)
- Rate limiting (in-memory, per-IP)
- Password reset flow
- Zod request validation
- Environment validation

## Prerequisites

- [Bun](https://bun.sh) installed

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env

# Create database schema
bun run db:push

# Start dev server
bun run dev
```

Server runs on `http://localhost:3000`.

## Environment Variables

```env
DATABASE_URL=./data.db
SESSION_SECRET=your-secret-key-here
```

## Project Structure

```
src/
├── db/
│   ├── schema.ts          # Drizzle schema (users, sessions, password_resets)
│   └── index.ts           # DB connection + repositories
├── services/
│   ├── auth.service.ts     # Login, register, logout, password reset
│   ├── user.service.ts     # User CRUD + profile management
│   └── password.service.ts  # Password hashing (bcrypt)
├── middleware/
│   ├── auth.middleware.ts       # Session validation
│   ├── rbac.middleware.ts       # Role-based access control
│   ├── error.middleware.ts      # Global error handler
│   └── rate-limit.ts           # Rate limiting
├── routes/
│   ├── auth.routes.ts      # Auth endpoints
│   └── user.routes.ts      # User CRUD endpoints
├── lib/
│   └── env.ts              # Environment validation
└── index.ts                # App entry, global middleware
```

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login (rate limited: 5/15min) |
| POST | `/auth/forgot-password` | - | Request password reset |
| POST | `/auth/reset-password` | - | Reset password with token |
| POST | `/auth/logout` | ✅ | Logout |
| POST | `/auth/logout-all` | ✅ | Logout all devices |
| GET | `/auth/me` | ✅ | Get current user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | ✅ | List all users (admin only) |
| GET | `/api/users/:id` | ✅ | Get user profile |
| PATCH | `/api/users/:id` | ✅ | Update profile |
| DELETE | `/api/users/:id` | ✅ | Delete user (admin only) |
| PATCH | `/api/users/:id/role` | ✅ | Change role (admin only) |

## Authentication

Include session ID in header:
```
Authorization: Bearer <sessionId>
```

## Usage Examples

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123","name":"Admin"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

### Authenticated Request
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <sessionId>"
```

## Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- Session expires in 7 days
- Password reset token expires in 1 hour
- Login rate limited: 5 attempts per 15 minutes
- All devices logged out on password reset

## Scripts

```bash
bun run dev      # Run with hot reload (port 3000)
bun run start   # Run without hot reload
bun test        # Run tests
bun run db:push # Push schema to database (dev)
bun run db:studio # Open Drizzle Studio
```

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: SQLite (better-sqlite3)
- **Validation**: Zod
