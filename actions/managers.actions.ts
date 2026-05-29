"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

function generateTempPassword() {
  return Math.random().toString(36).slice(-8);
}

export async function completeShopManagerSignup(
  shopId: string,
  email: string
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // AUTH CHECK
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // FIND SHOP
  const shop = await prisma.shop.findUnique({
    where: {
      id: shopId,
    },
  });

  if (!shop) {
    return { error: "Shop not found" };
  }

  // OWNER CHECK
  if (shop.ownerId !== session.user.id) {
    return { error: "Access denied" };
  }

  // FIND USER
  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  let tempPassword: string | null = null;

  // CREATE USER IF NOT EXISTS
  if (!user) {
    tempPassword = generateTempPassword();

    user = await prisma.user.create({
      data: {
        name: email.split("@")[0],
        email,
        role: "SHOP_MANAGER",
        mustChangePassword: true,
      },
    });

    // CREATE ACCOUNT
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: email,
        providerId: "credential",
        password: tempPassword, // later hash this
      },
    });
  } else {
    // UPDATE ROLE
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        role: "SHOP_MANAGER",
      },
    });
  }

  // CHECK EXISTING MANAGER
  const existingManager = await prisma.shopManager.findFirst({
    where: {
      userId: user.id,
      shopId,
    },
  });

  if (existingManager) {
    return {
      error: "User is already manager of this shop",
    };
  }

  // CREATE RELATION
  await prisma.shopManager.create({
    data: {
      userId: user.id,
      shopId,
    },
  });

  revalidatePath(`/shop-owner/${shopId}/managers`);

  return {
    success: true,
    message: "Manager added successfully",
    tempPassword,
  };
}

export async function getManagerShop(userId: string) {
  const manager = await prisma.shopManager.findFirst({
    where: {
      userId,
    },
  });

  return manager;
}

export async function removeManager(
  shopId: string,
  managerId: string
) {
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

  // DELETE MANAGER
  await prisma.shopManager.delete({
    where: {
      id: managerId,
    },
  });

  revalidatePath(`/shop-owner/${shopId}/managers`);

  return {
    success: true,
  };
}