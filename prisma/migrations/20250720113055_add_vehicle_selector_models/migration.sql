/*
  Warnings:

  - You are about to drop the column `engineType` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `length` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unitOfMeasure` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleBrand` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleModel` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `yearOfManufacture` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('PASSENGER', 'COMMERCIAL');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "engineType",
DROP COLUMN "height",
DROP COLUMN "length",
DROP COLUMN "unitOfMeasure",
DROP COLUMN "vehicleBrand",
DROP COLUMN "vehicleModel",
DROP COLUMN "weight",
DROP COLUMN "width",
DROP COLUMN "yearOfManufacture",
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VehicleBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,

    CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGeneration" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT,
    "vinCode" TEXT,
    "bodyStyles" JSONB,
    "engines" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductToVehicleGeneration" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductToVehicleGeneration_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_name_key" ON "VehicleBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_name_brandId_key" ON "VehicleModel"("name", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleGeneration_modelId_name_key" ON "VehicleGeneration"("modelId", "name");

-- CreateIndex
CREATE INDEX "_ProductToVehicleGeneration_B_index" ON "_ProductToVehicleGeneration"("B");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGeneration" ADD CONSTRAINT "VehicleGeneration_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToVehicleGeneration" ADD CONSTRAINT "_ProductToVehicleGeneration_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToVehicleGeneration" ADD CONSTRAINT "_ProductToVehicleGeneration_B_fkey" FOREIGN KEY ("B") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
