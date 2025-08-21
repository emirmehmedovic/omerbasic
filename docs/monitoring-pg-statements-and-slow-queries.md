# Monitoring database queries: pg_stat_statements + slow query logging

This guide shows how to enable query monitoring and slow query logging for PostgreSQL so we can identify expensive statements and tune indexes/queries.

Note: Steps vary by hosting provider. Managed Postgres often exposes these as parameters in the dashboard; self-hosted requires editing postgresql.conf and a restart.

## 1) Enable pg_stat_statements

pg_stat_statements tracks execution statistics of all SQL statements.

- Ensure the extension is available:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

- Set required parameters (provider UI or postgresql.conf):
```
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.save = on
```

- Restart PostgreSQL for shared_preload_libraries to take effect.

- Verify:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
```

## 2) Enable slow query logging

Helps capture statements slower than a threshold (e.g., 500ms). Configure via provider UI or postgresql.conf:
```
log_min_duration_statement = 500    # log statements slower than 500 ms
log_statement = 'ddl'               # optionally log DDLs
log_checkpoints = on                # optional
log_connections = on                # optional
log_disconnections = on             # optional
```

Location of logs depends on hosting (CloudWatch, Stackdriver, file system, etc.).

## 3) Useful queries with pg_stat_statements

- Top time-consuming queries:
```sql
SELECT
  mean_time::numeric(10,2) AS mean_ms,
  total_time::numeric(10,2) AS total_ms,
  calls,
  rows,
  query
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 50;
```

- Highest mean execution time:
```sql
SELECT
  mean_time::numeric(10,2) AS mean_ms,
  calls,
  rows,
  query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 50;
```

- Most I/O heavy (shared/local hits/misses summary):
```sql
SELECT
  blk_read_time::numeric(10,2) AS read_ms,
  blk_write_time::numeric(10,2) AS write_ms,
  shared_blks_read,
  shared_blks_dirtied,
  query
FROM pg_stat_statements
ORDER BY (blk_read_time + blk_write_time) DESC
LIMIT 50;
```

- Reset stats (use carefully):
```sql
SELECT pg_stat_statements_reset();
```

## 4) Application-side tips

- Always use parameterized queries (Prisma does this by default) to get better pg_stat_statements normalization.
- Use proper indexes for filters and ordering used by keyset pagination.
- Prefer trigram + unaccent for fuzzy text search, with functional GIN indexes.
- Watch for N+1 patterns; use CTEs/joins when appropriate.

## 5) Rollback / disable

- Disable slow logs by increasing threshold or setting `log_min_duration_statement = -1`.
- Disable extension if needed (requires restart to remove from shared_preload_libraries):
```sql
DROP EXTENSION IF EXISTS pg_stat_statements;
```
