# AGENTS.md

## Project
Bun + Hono backend starter kit with session-based auth, RBAC, job queues, and structured logging.

## Dev Commands
```bash
bun install          # Install deps
bun run dev         # API server with hot reload (port 3000)
bun run start       # API server without hot reload
bun run worker      # Worker process (job queues, needs Redis)
bun run dev:all     # API + Worker together
bun test            # Run unit tests
bun run db:generate # Generate migrations
bun run db:migrate  # Apply migrations
bun run db:push     # Push schema (dev only)
bun run db:seed     # Seed initial data
```

## Setup
1. `cp .env.example .env`
2. `bun run db:generate && bun run db:push`
3. `bun run db:seed` (optional, creates admin user)

## Architecture
- `src/` - API server entry at `src/index.ts`
- `worker/` - Separate worker process for job queues
- `shared/` - Shared types for jobs
- `scripts/` - Migrations and seeds
- Database schema in `src/db/schema.ts`; drizzle-kit uses static schema, runtime uses factory pattern in `src/db/index.ts`

## Database
- Default: SQLite (`file:./data.db`)
- Supports MySQL and PostgreSQL via `DB_CONNECTION` and `DATABASE_URL` env vars
- Drizzle migrations in `drizzle/` folder

## Auth
- Session-based, stored in SQLite
- Use `Authorization: Bearer <sessionId>` header
- Roles: `admin` (all permissions), `user` (limited)
- Password reset token expires 1 hour

## Required Environment Variables
| Variable | When Required |
|----------|---------------|
| `REDIS_URL` | For job queues (worker) |

## Key Files
- `drizzle.config.ts` - Drizzle config (uses static schema for CLI)
- `src/lib/env.ts` - Environment validation with Zod
- `src/middleware/auth.middleware.ts` - Session validation
- `src/middleware/rbac.middleware.ts` - Role-based access control
- `src/routes/` - API route definitions

## Testing
- Tests in `tests/unit/`
- No test script in package.json; run with `bun test` or specify file: `bun test tests/unit/services/`
