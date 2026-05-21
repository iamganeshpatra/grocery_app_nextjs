/*
  Warnings:

  - You are about to drop the `_ShopManagers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ShopManagers" DROP CONSTRAINT "_ShopManagers_A_fkey";

-- DropForeignKey
ALTER TABLE "_ShopManagers" DROP CONSTRAINT "_ShopManagers_B_fkey";

-- DropTable
DROP TABLE "_ShopManagers";

-- CreateTable
CREATE TABLE "ShopManager" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopManager_shopId_userId_key" ON "ShopManager"("shopId", "userId");

-- AddForeignKey
ALTER TABLE "ShopManager" ADD CONSTRAINT "ShopManager_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopManager" ADD CONSTRAINT "ShopManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
