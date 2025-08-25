-- CreateEnum
CREATE TYPE "AdMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- DropIndex
DROP INDEX "product_catalog_trgm_idx";

-- DropIndex
DROP INDEX "product_category_created_id_idx";

-- DropIndex
DROP INDEX "product_created_id_idx";

-- DropIndex
DROP INDEX "product_name_trgm_idx";

-- CreateTable
CREATE TABLE "AdvertisingScreen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mediaType" "AdMediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertisingScreen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvertisingScreen_slug_key" ON "AdvertisingScreen"("slug");
