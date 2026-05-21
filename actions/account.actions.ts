"use server"

import { prisma } from "@/lib/db"

export async function completeBuyerSignup(userId: string){

    await prisma.user.update({
        where:{
            id: userId
        },
        data:{
            role:"CUSTOMER"
        }
    })
}

export async function completeSellerSignup(userId: string){

    await prisma.user.update({
        where:{
            id: userId
        },
        data:{
            role:"SHOP_OWNER"
        }
    })
}

export async function completeShopManagerSignup(
  userId: string,
  shopId: string
) {
  // update role
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role: "SHOP_MANAGER",
    },
  });

  // create relation
  await prisma.shopManager.create({
    data: {
      userId,
      shopId,
    },
  });
}
export async function getManagerShop(userId: string) {
  const manager = await prisma.shopManager.findFirst({
    where: {
      userId,
    },
  });

  return manager;
}