"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type CreateShopType = {
  name: string;
  category: string;
};

export const CreateShop = async ({
  name,
  category,
}: CreateShopType) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // auth check
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // role check
  if (session.user.role !== "SHOP_OWNER") {
    throw new Error("Access denied");
  }

  // create shop
  const shop = await prisma.shop.create({
    data: {
      name,
      category,
      ownerId: session.user.id,
    },
  });

  return {
    success: true,
    shop,
  };
};

export const deleteShop = async (shopId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // AUTH CHECK
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // FIND SHOP
  const shop = await prisma.shop.findUnique({
    where: {
      id: shopId,
    },
  });

  // SHOP NOT FOUND
  if (!shop) {
    throw new Error("Shop not found");
  }

  // OWNER CHECK
  if (shop.ownerId !== session.user.id) {
    throw new Error("Access denied");
  }

  // DELETE SHOP
  await prisma.shop.delete({
    where: {
      id: shopId,
    },
  });

  revalidatePath("/shop-owner");

  return {
    success: true,
  };
};