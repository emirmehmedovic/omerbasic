-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Product_categoryId_isArchived_idx" ON "Product"("categoryId", "isArchived");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE INDEX "Product_updatedAt_idx" ON "Product"("updatedAt");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "ProductVehicleFitment_generationId_engineId_idx" ON "ProductVehicleFitment"("generationId", "engineId");

-- CreateIndex
CREATE INDEX "ProductVehicleFitment_productId_idx" ON "ProductVehicleFitment"("productId");

-- CreateIndex
CREATE INDEX "VehicleGeneration_modelId_idx" ON "VehicleGeneration"("modelId");
