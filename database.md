psql 'postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

Ovdje je smješten connection string za bazu podataka

## Indeksi i ekstenzije za pretragu

Za upute kako jednom po bazi omogućiti `pg_trgm` i `unaccent` te kreirati potrebne trigram indekse, pogledaj:

- `docs/db-indexing-and-extensions.md`

Quick run (idempotent):

```bash
# pobrini se da DATABASE_URL pokazuje na ciljnu bazu
export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
npx tsx scripts/create-trgm-indexes.ts
```