-- Add composite indexes for ProductVehicleFitment to optimize nested queries
-- Run this migration manually if Prisma migrate is not available

-- Index for productId + generationId lookups (common in listing queries)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_productId_generationId_idx" 
  ON "ProductVehicleFitment"("productId", "generationId");

-- Index for productId + engineId lookups (common in filtering)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_productId_engineId_idx" 
  ON "ProductVehicleFitment"("productId", "engineId");

-- Index for generationId lookups (reverse lookups - products by generation)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_generationId_idx" 
  ON "ProductVehicleFitment"("generationId");

-- Index for engineId lookups (reverse lookups - products by engine)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_engineId_idx" 
  ON "ProductVehicleFitment"("engineId");



