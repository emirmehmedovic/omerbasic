-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "standards" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "technicalSpecs" JSONB;

-- AlterTable
ALTER TABLE "VehicleGeneration" ADD COLUMN     "engineCapacity" INTEGER,
ADD COLUMN     "engineCode" TEXT,
ADD COLUMN     "enginePowerHP" DOUBLE PRECISION,
ADD COLUMN     "enginePowerKW" DOUBLE PRECISION,
ADD COLUMN     "engineType" TEXT;
