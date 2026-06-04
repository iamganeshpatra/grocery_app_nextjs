"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function requireCustomer() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "CUSTOMER") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

export async function addToCart(data: { productId: string; shopId: string; quantity: number }) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  if (data.quantity < 1) return { error: "Quantity must be at least 1" }

  // Validate the product is sold by this shop and has enough stock
  const shopProduct = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId: data.shopId, productId: data.productId } },
  })
  if (!shopProduct) return { error: "This shop no longer carries this product" }
  if (shopProduct.stock < data.quantity) {
    return { error: `Only ${shopProduct.stock} in stock` }
  }

  // If the same product+shop is already in the cart, add to the existing quantity
  const existing = await prisma.cart.findFirst({
    where: { userId: session!.user.id, productId: data.productId, shopId: data.shopId },
  })

  if (existing) {
    const newQty = existing.quantity + data.quantity
    if (shopProduct.stock < newQty) return { error: `Only ${shopProduct.stock} in stock` }
    await prisma.cart.update({ where: { id: existing.id }, data: { quantity: newQty } })
  } else {
    await prisma.cart.create({
      data: {
        userId: session!.user.id,
        productId: data.productId,
        shopId: data.shopId,
        quantity: data.quantity,
      },
    })
  }

  revalidatePath("/customer/cart")
  return { success: true }
}

export async function updateCartQuantity(cartId: string, quantity: number) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const item = await prisma.cart.findFirst({ where: { id: cartId, userId: session!.user.id } })
  if (!item) return { error: "Cart item not found" }

  if (quantity < 1) return { error: "Quantity must be at least 1" }

  const shopProduct = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId: item.shopId, productId: item.productId } },
  })
  if (!shopProduct || shopProduct.stock < quantity) {
    return { error: `Only ${shopProduct?.stock ?? 0} in stock` }
  }

  await prisma.cart.update({ where: { id: cartId }, data: { quantity } })
  revalidatePath("/customer/cart")
  return { success: true }
}

export async function removeFromCart(cartId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  await prisma.cart.deleteMany({ where: { id: cartId, userId: session!.user.id } })
  revalidatePath("/customer/cart")
  return { success: true }
}