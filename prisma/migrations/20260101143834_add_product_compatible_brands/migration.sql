-- CreateTable: Junction table for Product <-> VehicleBrand many-to-many relationship
-- This allows products to have multiple compatible vehicle brands without loading all fitments
CREATE TABLE "_ProductToVehicleBrand" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex: Unique constraint to prevent duplicate relationships
CREATE UNIQUE INDEX "_ProductToVehicleBrand_AB_unique" ON "_ProductToVehicleBrand"("A", "B");

-- CreateIndex: Index on column A (productId) for fast lookups from Product side
CREATE INDEX "_ProductToVehicleBrand_A_idx" ON "_ProductToVehicleBrand"("A");

-- CreateIndex: Index on column B (vehicleBrandId) for fast lookups from VehicleBrand side
CREATE INDEX "_ProductToVehicleBrand_B_idx" ON "_ProductToVehicleBrand"("B");

-- AddForeignKey: Ensure referential integrity
ALTER TABLE "_ProductToVehicleBrand" ADD CONSTRAINT "_ProductToVehicleBrand_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductToVehicleBrand" ADD CONSTRAINT "_ProductToVehicleBrand_B_fkey" FOREIGN KEY ("B") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
