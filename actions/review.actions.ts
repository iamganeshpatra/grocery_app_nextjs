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

export async function submitReview(orderId: string, rating: number, comment: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }
  if (rating < 1 || rating > 5) return { error: "Pick a rating from 1 to 5" }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session!.user.id },
    include: { items: true },
  })
  if (!order) return { error: "Order not found" }
  if (order.status !== "DELIVERED") return { error: "You can only review delivered orders" }
  if (order.items.length === 0) return { error: "This order has no items" }

  // One review per order (schema enforces unique [customerId, orderId])
  const existing = await prisma.productReview.findUnique({
    where: { customerId_orderId: { customerId: session!.user.id, orderId } },
  })
  if (existing) return { error: "You have already reviewed this order" }

  await prisma.productReview.create({
    data: {
      customerId: session!.user.id,
      orderId,
      shopId: order.shopId,
      productId: order.items[0].productId, // one order = one shop; key the review to its first product
      rating,
      comment: comment.trim() || null,
    },
  })

  revalidatePath(`/customer/orders/${orderId}`)
  revalidatePath(`/customer/product/${order.items[0].productId}`)
  return { success: true }
}