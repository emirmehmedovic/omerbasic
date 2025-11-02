-- CreateTable
CREATE TABLE "B2BGroupCategoryManufacturerDiscount" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BGroupCategoryManufacturerDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "B2BGroupCategoryManufacturerDiscount_categoryId_idx" ON "B2BGroupCategoryManufacturerDiscount"("categoryId");

-- CreateIndex
CREATE INDEX "B2BGroupCategoryManufacturerDiscount_manufacturerId_idx" ON "B2BGroupCategoryManufacturerDiscount"("manufacturerId");

-- CreateIndex
CREATE INDEX "B2BGroupCategoryManufacturerDiscount_categoryId_manufacture_idx" ON "B2BGroupCategoryManufacturerDiscount"("categoryId", "manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "B2BGroupCategoryManufacturerDiscount_groupId_categoryId_man_key" ON "B2BGroupCategoryManufacturerDiscount"("groupId", "categoryId", "manufacturerId");

-- AddForeignKey
ALTER TABLE "B2BGroupCategoryManufacturerDiscount" ADD CONSTRAINT "B2BGroupCategoryManufacturerDiscount_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "B2BDiscountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupCategoryManufacturerDiscount" ADD CONSTRAINT "B2BGroupCategoryManufacturerDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupCategoryManufacturerDiscount" ADD CONSTRAINT "B2BGroupCategoryManufacturerDiscount_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
