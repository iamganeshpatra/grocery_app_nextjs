-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'SHOP_OWNER', 'SHOP_MANAGER', 'CUSTOMER');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "password" TEXT;
