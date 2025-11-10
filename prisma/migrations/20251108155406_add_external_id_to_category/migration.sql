-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE INDEX "Category_externalId_idx" ON "Category"("externalId");
