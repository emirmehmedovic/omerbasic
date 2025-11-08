/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `VehicleBrand` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `VehicleEngine` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[brandId,externalId]` on the table `VehicleModel` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "VehicleModel_name_brandId_key";

-- AlterTable
ALTER TABLE "VehicleBrand" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "VehicleEngine" ADD COLUMN     "cylinders" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "yearFrom" TIMESTAMP(3),
ADD COLUMN     "yearTo" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VehicleModel" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "period" TEXT,
ADD COLUMN     "productionEnd" TIMESTAMP(3),
ADD COLUMN     "productionStart" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_externalId_key" ON "VehicleBrand"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleEngine_externalId_key" ON "VehicleEngine"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_brandId_externalId_key" ON "VehicleModel"("brandId", "externalId");
