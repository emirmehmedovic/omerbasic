-- AlterTable
ALTER TABLE "Manufacturer" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE INDEX "Manufacturer_externalId_idx" ON "Manufacturer"("externalId");
