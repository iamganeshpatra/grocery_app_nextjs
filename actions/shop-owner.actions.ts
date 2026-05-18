"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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