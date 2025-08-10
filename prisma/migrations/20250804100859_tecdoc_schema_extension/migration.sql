-- AlterTable
ALTER TABLE "VehicleGeneration" ADD COLUMN     "axles" INTEGER,
ADD COLUMN     "brakeSystem" TEXT,
ADD COLUMN     "constructionType" TEXT,
ADD COLUMN     "doors" INTEGER,
ADD COLUMN     "driveType" TEXT,
ADD COLUMN     "fuelType" TEXT,
ADD COLUMN     "productionEnd" TIMESTAMP(3),
ADD COLUMN     "productionStart" TIMESTAMP(3),
ADD COLUMN     "transmission" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION,
ADD COLUMN     "wheelbase" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CategoryAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CategoryAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCrossReference" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "manufacturer" TEXT,
    "notes" TEXT,
    "replacementId" TEXT,

    CONSTRAINT "ProductCrossReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAttribute_name_categoryId_key" ON "CategoryAttribute"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key" ON "ProductAttributeValue"("productId", "attributeId");

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "CategoryAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCrossReference" ADD CONSTRAINT "ProductCrossReference_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCrossReference" ADD CONSTRAINT "ProductCrossReference_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
