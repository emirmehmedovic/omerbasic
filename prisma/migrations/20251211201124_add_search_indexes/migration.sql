-- DropIndex
DROP INDEX "Product_categoryId_isArchived_idx";

-- CreateIndex
CREATE INDEX "Product_categoryId_isArchived_stock_idx" ON "Product"("categoryId", "isArchived", "stock");

-- CreateIndex
CREATE INDEX "Product_oemNumber_idx" ON "Product"("oemNumber");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_numericValue_idx" ON "ProductAttributeValue"("attributeId", "numericValue");

-- CreateIndex
CREATE INDEX "ProductCrossReference_referenceNumber_idx" ON "ProductCrossReference"("referenceNumber");
