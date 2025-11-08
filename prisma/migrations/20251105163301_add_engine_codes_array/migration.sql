-- AlterTable
ALTER TABLE "VehicleEngine" ADD COLUMN     "engineCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
