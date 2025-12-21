-- Add GIN trigram index on ArticleOENumber.oemNumber for faster similarity search
-- This index improves performance when searching OEM numbers via LEFT JOIN

CREATE INDEX IF NOT EXISTS article_oe_number_oem_unaccent_trgm_idx
  ON "ArticleOENumber" USING GIN ((immutable_unaccent(lower(COALESCE("oemNumber", '')))) gin_trgm_ops);
