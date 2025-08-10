-- Uklanjanje starih kolona motora iz tablice VehicleGeneration
ALTER TABLE "VehicleGeneration" DROP COLUMN IF EXISTS "engineType";
ALTER TABLE "VehicleGeneration" DROP COLUMN IF EXISTS "enginePowerKW";
ALTER TABLE "VehicleGeneration" DROP COLUMN IF EXISTS "enginePowerHP";
ALTER TABLE "VehicleGeneration" DROP COLUMN IF EXISTS "engineCapacity";
ALTER TABLE "VehicleGeneration" DROP COLUMN IF EXISTS "engineCode";