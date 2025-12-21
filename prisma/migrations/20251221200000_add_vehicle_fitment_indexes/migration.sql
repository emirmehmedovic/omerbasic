-- Add composite indexes for ProductVehicleFitment to optimize nested queries
-- These indexes improve performance when fetching products with vehicle fitments

-- Index for productId + generationId lookups (common in listing queries with vehicle filters)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_productId_generationId_idx" 
  ON "ProductVehicleFitment"("productId", "generationId");

-- Index for productId + engineId lookups (common in filtering by specific engine)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_productId_engineId_idx" 
  ON "ProductVehicleFitment"("productId", "engineId");

-- Index for generationId lookups (reverse lookups - find all products for a generation)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_generationId_idx" 
  ON "ProductVehicleFitment"("generationId");

-- Index for engineId lookups (reverse lookups - find all products for an engine)
CREATE INDEX IF NOT EXISTS "ProductVehicleFitment_engineId_idx" 
  ON "ProductVehicleFitment"("engineId");



