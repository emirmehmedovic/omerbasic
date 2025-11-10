-- CreateEnum
CREATE TYPE "TransportVehicleType" AS ENUM ('TRUCK', 'TRAILER', 'SPECIALIZED', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportRequestStatus" AS ENUM ('NEW', 'VIEWED', 'CONTACTED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "TransportRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT,
    "vehicleType" "TransportVehicleType" NOT NULL,
    "cargo" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "notes" TEXT,
    "status" "TransportRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportRequest_status_idx" ON "TransportRequest"("status");

-- CreateIndex
CREATE INDEX "TransportRequest_createdAt_idx" ON "TransportRequest"("createdAt");
