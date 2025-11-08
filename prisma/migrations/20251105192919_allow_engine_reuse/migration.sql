/*
  Warnings:

  - A unique constraint covering the columns `[generationId,externalId]` on the table `VehicleEngine` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "VehicleEngine_externalId_key";

-- CreateIndex
CREATE UNIQUE INDEX "VehicleEngine_generationId_externalId_key" ON "VehicleEngine"("generationId", "externalId");
