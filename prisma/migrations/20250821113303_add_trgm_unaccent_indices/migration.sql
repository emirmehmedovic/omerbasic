-- Enable accent-insensitive trigram search.
-- Idempotent: safe to run multiple times.

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Ensure unaccent extension is installed
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Immutable wrapper around unaccent to allow functional indexes
-- Important: we bind to a specific dictionary ('public.unaccent') so the result
-- depends only on the input text and is safe to mark IMMUTABLE (as long as the
-- dictionary is not modified at runtime).
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
SET search_path = public, extensions
AS $$
  SELECT unaccent($1);
$$;

-- Base trigram GIN indexes
CREATE INDEX IF NOT EXISTS product_name_trgm_idx
  ON "Product" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_catalog_trgm_idx
  ON "Product" USING GIN ("catalogNumber" gin_trgm_ops);

-- Functional trigram GIN indexes (accent-insensitive, case-insensitive)
CREATE INDEX IF NOT EXISTS product_name_unaccent_trgm_idx
  ON "Product" USING GIN ((immutable_unaccent(lower("name"))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_catalog_unaccent_trgm_idx
  ON "Product" USING GIN ((immutable_unaccent(lower("catalogNumber"))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_oem_unaccent_trgm_idx
  ON "Product" USING GIN ((immutable_unaccent(lower(COALESCE("oemNumber", '')))) gin_trgm_ops);
