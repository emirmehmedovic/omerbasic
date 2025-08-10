/*
  Warnings:

  - You are about to drop the `_ProductToVehicleGeneration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProductToVehicleGeneration" DROP CONSTRAINT "_ProductToVehicleGeneration_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProductToVehicleGeneration" DROP CONSTRAINT "_ProductToVehicleGeneration_B_fkey";

-- DropTable
DROP TABLE "_ProductToVehicleGeneration";

-- CreateTable
CREATE TABLE "ProductVehicleFitment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "engineId" TEXT,
    "fitmentNotes" TEXT,
    "position" TEXT,
    "bodyStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "isUniversal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVehicleFitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVehicleFitment_productId_generationId_engineId_key" ON "ProductVehicleFitment"("productId", "generationId", "engineId");

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "VehicleEngine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
