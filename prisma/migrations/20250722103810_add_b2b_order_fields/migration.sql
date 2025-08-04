-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountPercentage" DOUBLE PRECISION,
ADD COLUMN     "isB2BOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "originalPrice" DOUBLE PRECISION;
