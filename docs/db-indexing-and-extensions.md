# PostgreSQL extensions and indexes for search

This project uses trigram search (`pg_trgm`) and accent-insensitive matching (`unaccent`). You only need to enable extensions and create indexes ONCE per database.

- If the target DB already has these extensions/indexes: do nothing.
- If not: run the script below or ship via a Prisma migration.

## One-time setup via script (recommended)

1) Ensure `DATABASE_URL` points to the target database (staging/prod):

```bash
export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

2) Run the script (idempotent; safe to run multiple times):

```bash
npx tsx scripts/create-trgm-indexes.ts
```

What it does:
- CREATE EXTENSION IF NOT EXISTS pg_trgm
- CREATE EXTENSION IF NOT EXISTS unaccent
- Create GIN trigram indexes on `name`, `catalogNumber`
- Create functional trigram GIN indexes on `unaccent(lower(...))` for `name`, `catalogNumber`, and `oemNumber`

## Alternative: manage via Prisma migration

If you prefer to apply during deploys automatically, add a SQL migration with idempotent statements:

```sql
-- 001_add_trgm_unaccent_indices.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX IF NOT EXISTS product_name_trgm_idx
  ON "Product" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_catalog_trgm_idx
  ON "Product" USING GIN ("catalogNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_name_unaccent_trgm_idx
  ON "Product" USING GIN ((unaccent(lower("name"))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_catalog_unaccent_trgm_idx
  ON "Product" USING GIN ((unaccent(lower("catalogNumber"))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_oem_unaccent_trgm_idx
  ON "Product" USING GIN ((unaccent(lower(COALESCE("oemNumber", '')))) gin_trgm_ops);
```

Note: Prisma Migrate does not manage extensions by default; executing raw SQL in a migration file works fine as long as your deploy user has enough privileges.

## Permissions on managed Postgres

- `CREATE EXTENSION` requires appropriate privileges. On many managed providers (e.g., RDS, Neon) this is allowed for common extensions like `pg_trgm` and `unaccent`, but verify your plan.
- If `CREATE EXTENSION` is restricted, ask your DBA/provider to enable them or use an init script with elevated role.

## Verifying setup

From `psql` connected to the target DB:

```sql
-- List installed extensions
\dx

-- Check indexes created on Product
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'Product'
ORDER BY indexname;
```

You should see entries for `pg_trgm`, `unaccent`, and the indexes listed above.

## Re-running

All statements are `IF NOT EXISTS`, so the script/migration is idempotent. You can safely re-run without side effects.

## Rollback (optional)

If you need to drop indexes:

```sql
DROP INDEX IF EXISTS product_name_unaccent_trgm_idx;
DROP INDEX IF EXISTS product_catalog_unaccent_trgm_idx;
DROP INDEX IF EXISTS product_oem_unaccent_trgm_idx;
DROP INDEX IF EXISTS product_name_trgm_idx;
DROP INDEX IF EXISTS product_catalog_trgm_idx;
```

(Extensions usually stay enabled globally; drop only if you know the impact.)
