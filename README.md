# Hono Starter Kit

Production-ready Bun + Hono backend with session-based authentication, RBAC, BullMQ job queues, S3 uploads, audit logging, and OpenAPI documentation.

## Features

- Session-based authentication (not JWT)
- Role-based access control (user, admin)
- Rate limiting (in-memory, per-IP)
- Password reset flow
- BullMQ job queues (email, broadcast)
- S3-compatible file uploads with presigned URLs
- Audit logging
- OpenAPI docs (Swagger UI + JSON spec)
- Multi-database support (SQLite, MySQL, PostgreSQL)
- Zod request validation
- Environment validation

## Prerequisites

- [Bun](https://bun.sh) installed
- [Redis](https://redis.io) (for job queues, optional)

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env

# Push schema to database (development)
bun run db:push

# Seed initial data (optional - creates admin & sample users)
bun run db:seed

# Start dev server
bun run dev
```

Server runs on `http://localhost:3000`.

## Environment Variables

```env
# Database
DB_CONNECTION=sqlite  # Options: sqlite, mysql, pgsql
DATABASE_URL=file:./data.db

# Session
SESSION_SECRET=your-secret-key-here

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Project Structure

```
src/
├── db/
│   ├── schema-factory.ts   # Dialect-specific schema factory
│   ├── schema.sqlite.ts    # SQLite schema
│   ├── schema.mysql.ts     # MySQL schema
│   ├── schema.pgsql.ts     # PostgreSQL schema
│   ├── connection.ts       # DB connection factory
│   └── index.ts            # DB connection + repositories
├── docs/
│   └── openapi.yaml        # OpenAPI specification
├── middleware/
│   ├── auth.middleware.ts       # Session validation
│   ├── rbac.middleware.ts       # Role-based access control
│   ├── error.middleware.ts      # Global error handler
│   └── rate-limit.ts            # Rate limiting
├── routes/
│   ├── auth.routes.ts      # Auth endpoints
│   ├── user.routes.ts      # User CRUD endpoints
│   ├── upload.routes.ts    # S3 upload endpoints
│   ├── audit.routes.ts     # Audit log endpoints
│   ├── broadcast.routes.ts # Admin broadcast endpoints
│   ├── health.routes.ts    # Health check endpoints
│   └── index.ts            # Route aggregation
├── services/
│   ├── auth.service.ts     # Login, register, logout, password reset
│   ├── user.service.ts     # User CRUD + profile management
│   ├── upload.service.ts   # S3 upload handling
│   ├── audit.service.ts    # Audit logging
│   └── password.service.ts  # Password hashing (bcrypt)
├── lib/
│   └── env.ts              # Environment validation
└── index.ts                # App entry, global middleware

worker/
├── index.ts               # Worker entry point
└── queues/
    ├── email.ts           # Email job queue
    └── broadcast.ts       # Broadcast job queue

scripts/
├── seed.ts               # Main seed script
└── seed-rbac.ts          # RBAC seed script

tests/
└── unit/                 # Unit tests
```

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login (rate limited: 5/15min) |
| POST | `/auth/forgot-password` | - | Request password reset |
| POST | `/auth/reset-password` | - | Reset password with token |
| POST | `/auth/logout` | :white_check_mark: | Logout |
| POST | `/auth/logout-all` | :white_check_mark: | Logout all devices |
| GET | `/auth/me` | :white_check_mark: | Get current user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | :white_check_mark: | List all users (admin only) |
| GET | `/api/users/:id` | :white_check_mark: | Get user profile |
| PATCH | `/api/users/:id` | :white_check_mark: | Update profile |
| DELETE | `/api/users/:id` | :white_check_mark: | Delete user (admin only) |
| PATCH | `/api/users/:id/role` | :white_check_mark: | Change role (admin only) |

### Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload/presigned-url` | :white_check_mark: | Get S3 presigned URL |
| GET | `/api/upload/files` | :white_check_mark: | List user files |
| DELETE | `/api/upload/files/:id` | :white_check_mark: | Delete file |

### Audit

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/audit` | :white_check_mark: | List audit logs (admin only) |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/broadcast` | :white_check_mark: | Send broadcast (admin only) |

### Health & Docs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | - | Health check with DB status |
| GET | `/docs` | - | Swagger UI documentation |
| GET | `/api/spec` | - | OpenAPI JSON spec |

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

### Health Check
```bash
curl http://localhost:3000/health
```

## Worker / Job Queues

Start the worker separately for job processing (email, broadcast):

```bash
bun run worker
```

Or run both API and worker together:
```bash
bun run dev:all
```

Requires `REDIS_URL` in environment.

## Testing

```bash
bun test                    # Run all tests
bun test tests/unit/        # Run unit tests
bun test tests/unit/auth    # Run specific test suite
```

## Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- Session expires in 7 days (configurable via `SESSION_EXPIRY_DAYS`)
- Password reset token expires in 1 hour
- Login rate limited: 5 attempts per 15 minutes
- All devices logged out on password reset

## Scripts

```bash
bun run dev                  # Run with hot reload (port 3000)
bun run start                # Run without hot reload
bun run worker               # Run worker process (needs Redis)
bun run dev:all              # Run API + worker together

bun run db:generate          # Generate migrations
bun run db:migrate           # Apply migrations
bun run db:push              # Push schema to database (dev)
bun run db:studio            # Open Drizzle Studio
bun run db:seed              # Seed initial data
bun run db:seed:rbac         # Seed RBAC data only

# Dialect-specific migration generation
bun run db:generate:mysql    # Generate MySQL migrations
bun run db:generate:pgsql    # Generate PostgreSQL migrations
bun run db:generate:sqlite    # Generate SQLite migrations

bun test                     # Run tests
```

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: SQLite, MySQL, or PostgreSQL
- **Queue**: BullMQ + Redis
- **Validation**: Zod
- **Logging**: Pino

## Docker

### Production
```bash
cp .env.example .env
# Edit .env with production values

docker-compose up -d
```

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Deployment

The app includes:
- Multi-stage Dockerfile for minimal production image
- docker-compose.yml for easy deployment (app, redis, loki, promtail, grafana)
- GitHub Actions CI workflow
- Health check endpoint with DB status

### Environment Variables for Production

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_CONNECTION` | Yes | Database dialect: sqlite, mysql, pgsql |
| `DATABASE_URL` | Yes | Database connection string |
| `SESSION_SECRET` | Yes | Min 32 characters |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: localhost:3000) |
| `REDIS_URL` | For queues | Redis connection string |
| `PORT` | No | Server port (default: 3000) |
