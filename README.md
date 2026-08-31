# Backend Taaruf

Bun + Hono REST API with session-based authentication and RBAC.

## Quick Start

```bash
bun install
bun run db:push  # Create database schema
bun run dev      # Start dev server (port 3000)
```

## API Usage

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

## Stack

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: SQLite (better-sqlite3)
- **Validation**: Zod
- **Auth**: Session-based (not JWT)
