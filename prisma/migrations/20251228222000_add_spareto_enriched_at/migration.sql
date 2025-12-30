-- Add sparetoEnrichedAt timestamp field to Product table
ALTER TABLE "Product" ADD COLUMN "sparetoEnrichedAt" TIMESTAMP;

-- Create index for performance
CREATE INDEX "Product_sparetoEnrichedAt_idx" ON "Product"("sparetoEnrichedAt");
