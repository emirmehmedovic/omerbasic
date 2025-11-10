-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tecdocArticleId" INTEGER,
ADD COLUMN     "tecdocProductId" INTEGER;

-- CreateIndex
CREATE INDEX "Product_tecdocArticleId_idx" ON "Product"("tecdocArticleId");

-- CreateIndex
CREATE INDEX "Product_tecdocProductId_idx" ON "Product"("tecdocProductId");
