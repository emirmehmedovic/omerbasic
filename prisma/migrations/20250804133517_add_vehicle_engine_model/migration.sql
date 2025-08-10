/*
  Warnings:

  - You are about to drop the column `engineCapacity` on the `VehicleGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `engineCode` on the `VehicleGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `enginePowerHP` on the `VehicleGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `enginePowerKW` on the `VehicleGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `engineType` on the `VehicleGeneration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VehicleGeneration" DROP COLUMN "engineCapacity",
DROP COLUMN "engineCode",
DROP COLUMN "enginePowerHP",
DROP COLUMN "enginePowerKW",
DROP COLUMN "engineType",
ALTER COLUMN "productionEnd" SET DATA TYPE TEXT,
ALTER COLUMN "productionStart" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "VehicleEngine" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "engineType" TEXT NOT NULL,
    "enginePowerKW" DOUBLE PRECISION,
    "enginePowerHP" DOUBLE PRECISION,
    "engineCapacity" INTEGER,
    "engineCode" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleEngine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehicleEngine" ADD CONSTRAINT "VehicleEngine_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
