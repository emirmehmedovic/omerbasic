-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'B2B';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discountPercentage" DOUBLE PRECISION DEFAULT 0;
