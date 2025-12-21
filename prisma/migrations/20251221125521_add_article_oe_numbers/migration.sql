-- CreateTable
CREATE TABLE "ArticleOENumber" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oemNumber" TEXT NOT NULL,
    "manufacturer" TEXT,
    "referenceType" TEXT DEFAULT 'Original',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleOENumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleOENumber_oemNumber_idx" ON "ArticleOENumber"("oemNumber");

-- CreateIndex
CREATE INDEX "ArticleOENumber_productId_idx" ON "ArticleOENumber"("productId");

-- CreateIndex
CREATE INDEX "ArticleOENumber_manufacturer_idx" ON "ArticleOENumber"("manufacturer");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleOENumber_productId_oemNumber_key" ON "ArticleOENumber"("productId", "oemNumber");

-- AddForeignKey
ALTER TABLE "ArticleOENumber" ADD CONSTRAINT "ArticleOENumber_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migriraj postojeće oemNumber podatke u ArticleOENumber tabelu (backward compatibility)
-- Ovo osigurava da svi postojeći OEM brojevi budu dostupni u novom sistemu
INSERT INTO "ArticleOENumber" (id, "productId", "oemNumber", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text as id,
  id as "productId",
  "oemNumber" as "oemNumber",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "Product"
WHERE "oemNumber" IS NOT NULL 
  AND "oemNumber" != ''
  AND "oemNumber" != 'null'
  AND NOT EXISTS (
    SELECT 1 FROM "ArticleOENumber" aoe 
    WHERE aoe."productId" = "Product".id 
    AND aoe."oemNumber" = "Product"."oemNumber"
  );
