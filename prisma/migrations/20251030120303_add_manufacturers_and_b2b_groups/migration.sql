-- CreateEnum
CREATE TYPE "B2BDiscountStackingStrategy" AS ENUM ('MAX', 'ADDITIVE', 'PRIORITY');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "manufacturerId" TEXT;

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BDiscountGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "stackingStrategy" "B2BDiscountStackingStrategy" NOT NULL DEFAULT 'MAX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BDiscountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2BGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BGroupCategoryDiscount" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BGroupCategoryDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BGroupManufacturerDiscount" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BGroupManufacturerDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_slug_key" ON "Manufacturer"("slug");

-- CreateIndex
CREATE INDEX "B2BDiscountGroup_priority_idx" ON "B2BDiscountGroup"("priority");

-- CreateIndex
CREATE INDEX "B2BGroupMember_userId_idx" ON "B2BGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "B2BGroupMember_groupId_userId_key" ON "B2BGroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "B2BGroupCategoryDiscount_categoryId_idx" ON "B2BGroupCategoryDiscount"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "B2BGroupCategoryDiscount_groupId_categoryId_key" ON "B2BGroupCategoryDiscount"("groupId", "categoryId");

-- CreateIndex
CREATE INDEX "B2BGroupManufacturerDiscount_manufacturerId_idx" ON "B2BGroupManufacturerDiscount"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "B2BGroupManufacturerDiscount_groupId_manufacturerId_key" ON "B2BGroupManufacturerDiscount"("groupId", "manufacturerId");

-- CreateIndex
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupMember" ADD CONSTRAINT "B2BGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "B2BDiscountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupMember" ADD CONSTRAINT "B2BGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupCategoryDiscount" ADD CONSTRAINT "B2BGroupCategoryDiscount_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "B2BDiscountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupCategoryDiscount" ADD CONSTRAINT "B2BGroupCategoryDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupManufacturerDiscount" ADD CONSTRAINT "B2BGroupManufacturerDiscount_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "B2BDiscountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BGroupManufacturerDiscount" ADD CONSTRAINT "B2BGroupManufacturerDiscount_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
