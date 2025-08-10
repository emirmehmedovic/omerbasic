-- AlterTable
ALTER TABLE "CategoryAttribute" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "isComparable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportedUnits" JSONB,
ADD COLUMN     "validationRules" JSONB;

-- AlterTable
ALTER TABLE "ProductAttributeValue" ADD COLUMN     "numericValue" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "AttributeGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AttributeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttributeGroup_name_categoryId_key" ON "AttributeGroup"("name", "categoryId");

-- AddForeignKey
ALTER TABLE "AttributeGroup" ADD CONSTRAINT "AttributeGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AttributeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
