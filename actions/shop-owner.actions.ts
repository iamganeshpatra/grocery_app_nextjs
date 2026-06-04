"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type CreateShopType = {
  name: string;
  category: string;
  description: string;
  contactPhone: string;
};

export const CreateShop = async ({
  name,
  category,
  description,
  contactPhone,
}: CreateShopType) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // AUTH CHECK
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // ROLE CHECK
  if (session.user.role !== "SHOP_OWNER") {
    throw new Error("Access denied");
  }

  // CREATE SHOP
  const shop = await prisma.shop.create({
    data: {
      name,
      category,
      description,
      contactPhone,
      ownerId: session.user.id,
    },
  });

  return {
    success: true,
    shop,
  }
};

export const updateShop = async (
  shopId: string,
  data: {
    name: string;
    category: string;
    description?: string;
    contactPhone?: string;
  }
) => {
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

  // UPDATE SHOP
  const updatedShop = await prisma.shop.update({
    where: {
      id: shopId,
    },
    data: {
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
    },
  });

  revalidatePath("/shop-owner");
  revalidatePath(`/shop-owner/${shopId}`);
  revalidatePath(`/shop-owner/${shopId}/edit`);

  return {
    success: true,
    shop: updatedShop,
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