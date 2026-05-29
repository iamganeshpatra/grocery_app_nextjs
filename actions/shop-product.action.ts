"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function requireShopAccess(shopId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }

  const role = session.user.role as string

  if (role === "SHOP_OWNER") {
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, ownerId: session.user.id },
    })
    if (!shop) return { error: "Shop not found" as const, session: null }
  } else if (role === "SHOP_MANAGER") {
    const assignment = await prisma.shopManager.findFirst({
      where: { shopId, userId: session.user.id },
    })
    if (!assignment) return { error: "Not assigned to this shop" as const, session: null }
  } else {
    return { error: "Forbidden" as const, session: null }
  }

  return { error: null, session }
}

export async function addProductToShop(
  shopId: string,
  data: { productId: string; stock: number; price: number }
) {
  const { error } = await requireShopAccess(shopId)
  if (error) return { error }

  if (data.stock < 0) return { error: "Stock cannot be negative" }
  if (data.price <= 0) return { error: "Price must be greater than 0" }

  // Check if already added
  const existing = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId, productId: data.productId } },
  })
  if (existing) return { error: "This product is already in your shop" }

  const shopProduct = await prisma.shopProduct.create({
    data: {
      shopId,
      productId: data.productId,
      stock: data.stock,
      price: data.price,
    },
  })

  revalidatePath(`/shop-owner/${shopId}/products`)
  revalidatePath(`/manager/${shopId}/products`)
  return { data: shopProduct }
}

export async function updateShopProduct(
  shopId: string,
  shopProductId: string,
  data: { stock: number; price: number }
) {
  const { error } = await requireShopAccess(shopId)
  if (error) return { error }

  if (data.stock < 0) return { error: "Stock cannot be negative" }
  if (data.price <= 0) return { error: "Price must be greater than 0" }

  const updated = await prisma.shopProduct.update({
    where: { id: shopProductId },
    data: { stock: data.stock, price: data.price },
  })

  revalidatePath(`/shop-owner/${shopId}/products`)
  revalidatePath(`/manager/${shopId}/products`)
  return { data: updated }
}

export async function removeProductFromShop(shopId: string, shopProductId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  // Only shop owners can remove products
  if (session.user.role !== "SHOP_OWNER") {
    return { error: "Only shop owners can remove products" }
  }

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) return { error: "Shop not found" }

  // Future sprint: check for active orders before allowing removal
  // For now, allow removal freely

  await prisma.shopProduct.delete({ where: { id: shopProductId } })

  revalidatePath(`/shop-owner/${shopId}/products`)
  return { success: true }
}

// Search global catalog — returns products NOT yet in this shop
export async function searchCatalog(shopId: string, query: string) {
  const { error } = await requireShopAccess(shopId)
  if (error) return { error, data: [] }

  if (!query.trim()) return { error: null, data: [] }

  // Get IDs of products already in this shop
  const existing = await prisma.shopProduct.findMany({
    where: { shopId },
    select: { productId: true },
  })
  const existingIds = existing.map((e) => e.productId)

  const products = await prisma.product.findMany({
    where: {
      AND: [
        { id: { notIn: existingIds } },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  })

  return { error: null, data: products }
}