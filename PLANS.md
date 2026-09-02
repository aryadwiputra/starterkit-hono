# Plan: Multi-Dialect Database Support (MySQL, PostgreSQL, SQLite)

## Context

User wants Laravel-like multi-database support. Single `.env` config determines which database to use.

**Goal:** Support MySQL, PostgreSQL, SQLite via `DB_CONNECTION` env var + `DATABASE_URL`.

---

## Architecture

### Factory Pattern Design

```
src/db/
├── connection.ts     # Creates db pool based on DB_CONNECTION
├── schema-factory.ts # Creates dialect-specific table definitions
├── index.ts        # Exports db + repositories (uses factory)
└── types.ts        # Shared types
```

### Env Config

```env
# SQLite
DB_CONNECTION=sqlite
DATABASE_URL=file:./data.db

# MySQL
DB_CONNECTION=mysql
DATABASE_URL=mysql://user:pass@localhost:3306/starterkit

# PostgreSQL
DB_CONNECTION=pgsql
DATABASE_URL=postgres://user:pass@localhost:5432/starterkit
```

---

## Implementation Steps

### 1. Update `src/lib/env.ts`

Add `DB_CONNECTION` with validation + derived `dialect` helper.

### 2. Create `src/db/connection.ts`

Factory that creates dialect-specific driver + drizzle instance:
- `sqlite` → `bun:sqlite` + `drizzle-orm/bun-sqlite`
- `mysql` → `mysql2/promise` + `drizzle-orm/mysql2`
- `pgsql` → `postgres` + `drizzle-orm/postgres-js`

### 3. Create `src/db/schema-factory.ts`

Factory function that accepts dialect and returns all tables:
```typescript
export function createSchema(dialect: 'mysql' | 'pgsql' | 'sqlite') {
  const table = dialect === 'mysql' ? mysqlTable 
           : dialect === 'pgsql' ? pgTable 
           : sqliteTable
  // ... return all tables using that table builder
}
```

### 4. Create `src/db/types.ts`

Shared type definitions for cross-dialect compatibility.

### 5. Update `src/db/index.ts`

Uses schema factory + connection factory to create db instance.

### 6. Update `drizzle.config.ts`

Use `dialect: env.DB_CONNECTION` dynamically.

### 7. Install drivers

```bash
bun add mysql2 pg postgres
```

### 8. Verify

Test each dialect:
```bash
DB_CONNECTION=mysql DATABASE_URL="mysql://..." bun run dev
DB_CONNECTION=pgsql DATABASE_URL="postgres://..." bun run dev
DB_CONNECTION=sqlite DATABASE_URL="file:./data.db" bun run dev
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/env.ts` | Add DB_CONNECTION |
| `src/db/connection.ts` | NEW - driver factory |
| `src/db/schema-factory.ts` | NEW - schema factory |
| `src/db/types.ts` | NEW - shared types |
| `src/db/index.ts` | Refactor to use factories |
| `drizzle.config.ts` | Dynamic dialect |
| `.env.example` | Add DB_CONNECTION examples |
| `package.json` | Add mysql2, pg, postgres |

---

## Drizzle Dialect Support

| Dialect | Package | Driver |
|---------|---------|--------|
| sqlite | drizzle-orm/bun-sqlite | bun:sqlite |
| mysql | drizzle-orm/mysql2 | mysql2/promise |
| pgsql | drizzle-orm/postgres-js | postgres |

**Note:** Drizzle ORM query patterns identical across dialects. Only table definitions and connection differ.
