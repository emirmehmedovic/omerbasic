-- Migration: Add TecDoc tracking fields to Product table
-- Generated: 2025-11-08

-- Add TecDoc tracking fields
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "tecdocArticleId" INTEGER,
ADD COLUMN IF NOT EXISTS "tecdocProductId" INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Product_tecdocArticleId_idx" ON "Product"("tecdocArticleId");
CREATE INDEX IF NOT EXISTS "Product_tecdocProductId_idx" ON "Product"("tecdocProductId");

-- Add comments for documentation
COMMENT ON COLUMN "Product"."tecdocArticleId" IS 'TecDoc articles.id - Link to TecDoc article';
COMMENT ON COLUMN "Product"."tecdocProductId" IS 'TecDoc search_trees.node_id - ROOT category node_id';
