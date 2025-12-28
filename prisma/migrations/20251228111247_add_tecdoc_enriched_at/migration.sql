-- Add tecdocEnrichedAt timestamp field to Product table
ALTER TABLE "Product" ADD COLUMN "tecdocEnrichedAt" TIMESTAMP;

-- Create index for performance
CREATE INDEX "Product_tecdocEnrichedAt_idx" ON "Product"("tecdocEnrichedAt");

-- Mark products with EAN codes as already enriched (from previous enrichment run)
-- This prevents re-processing products that were already enriched
UPDATE "Product"
SET "tecdocEnrichedAt" = NOW()
WHERE "tecdocArticleId" IS NOT NULL
  AND "eanCode" IS NOT NULL
  AND "eanCode" != '';
