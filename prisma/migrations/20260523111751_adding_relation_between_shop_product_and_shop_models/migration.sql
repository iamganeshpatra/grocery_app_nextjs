/*
  Warnings:

  - Added the required column `shopId` to the `shop_product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shop_product" ADD COLUMN     "shopId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "shop_product" ADD CONSTRAINT "shop_product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
