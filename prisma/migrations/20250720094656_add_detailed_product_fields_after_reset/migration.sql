/*
  Warnings:

  - A unique constraint covering the columns `[catalogNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `catalogNumber` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('PICKUP', 'COURIER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH_ON_DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "shippingMethod" "ShippingMethod";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "catalogNumber" TEXT NOT NULL,
ADD COLUMN     "engineType" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "length" DOUBLE PRECISION,
ADD COLUMN     "oemNumber" TEXT,
ADD COLUMN     "unitOfMeasure" TEXT,
ADD COLUMN     "vehicleBrand" TEXT,
ADD COLUMN     "vehicleModel" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION,
ADD COLUMN     "width" DOUBLE PRECISION,
ADD COLUMN     "yearOfManufacture" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_catalogNumber_key" ON "Product"("catalogNumber");
