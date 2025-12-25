-- AlterTable
-- First, set a default value for existing NULL records
UPDATE "Order" SET "customerPhone" = 'N/A' WHERE "customerPhone" IS NULL;

-- Then, make the column NOT NULL
ALTER TABLE "Order" ALTER COLUMN "customerPhone" SET NOT NULL;
