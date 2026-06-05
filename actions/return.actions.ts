"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const RETURN_WINDOW_DAYS = 7

async function requireCustomer() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "CUSTOMER") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

// Only the SHOP_OWNER (not managers) can resolve returns
async function requireOwnerForOrder(orderId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null, order: null }
  if (session.user.role !== "SHOP_OWNER") return { error: "Only the shop owner can action returns" as const, session: null, order: null }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: { select: { ownerId: true } }, items: true, returnRequest: true },
  })
  if (!order) return { error: "Order not found" as const, session: null, order: null }
  if (order.shop.ownerId !== session.user.id) return { error: "Not your shop" as const, session: null, order: null }

  return { error: null, session, order }
}

// ── Customer requests a return ───────────────────────────────────────────────

export async function requestReturn(orderId: string, reason: string, description: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }
  if (!reason.trim()) return { error: "A reason is required" }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session!.user.id },
    include: {
      returnRequest: true,
      statusHistory: { where: { toStatus: "DELIVERED" }, orderBy: { changedAt: "desc" }, take: 1 },
    },
  })
  if (!order) return { error: "Order not found" }
  if (order.status !== "DELIVERED") return { error: "Only delivered orders can be returned" }
  if (order.returnRequest) return { error: "A return has already been requested for this order" }

  // Enforce the 7-day window server-side
  const deliveredAt = order.statusHistory[0]?.changedAt
  if (!deliveredAt) return { error: "Delivery date not found" }
  const daysSince = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince > RETURN_WINDOW_DAYS) {
    return { error: "The 7-day return window has closed" }
  }

  await prisma.orderReturn.create({
    data: {
      orderId,
      requestedByUserId: session!.user.id,
      reason: reason.trim(),
      description: description.trim() || null,
      status: "PENDING",
    },
  })
  await prisma.order.update({ where: { id: orderId }, data: { status: "RETURN_REQUESTED" } })
  await prisma.orderStatusHistory.create({
    data: { orderId, fromStatus: "DELIVERED", toStatus: "RETURN_REQUESTED", changedByUserId: session!.user.id },
  })

  revalidatePath(`/customer/orders/${orderId}`)
  revalidatePath("/admin/returns")
  return { success: true }
}

// ── Owner approves ───────────────────────────────────────────────────────────

export async function approveReturn(orderId: string) {
  const { error, session, order } = await requireOwnerForOrder(orderId)
  if (error) return { error }
  if (order!.status !== "RETURN_REQUESTED") return { error: "This return is not pending" }

  // Restore stock — items are assumed returned and resaleable
  for (const item of order!.items) {
    await prisma.shopProduct.updateMany({
      where: { shopId: item.shopId, productId: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  await prisma.orderReturn.update({
    where: { orderId },
    data: { status: "APPROVED", resolvedByUserId: session!.user.id, resolvedAt: new Date() },
  })
  await prisma.order.update({ where: { id: orderId }, data: { status: "RETURN_APPROVED" } })
  await prisma.orderStatusHistory.create({
    data: { orderId, fromStatus: "RETURN_REQUESTED", toStatus: "RETURN_APPROVED", changedByUserId: session!.user.id },
  })

  revalidatePath(`/shop-owner/${order!.shopId}/orders/${orderId}`)
  revalidatePath(`/customer/orders/${orderId}`)
  revalidatePath("/admin/returns")
  return { success: true }
}

// ── Owner rejects ────────────────────────────────────────────────────────────

export async function rejectReturn(orderId: string, rejectionReason: string) {
  const { error, session, order } = await requireOwnerForOrder(orderId)
  if (error) return { error }
  if (order!.status !== "RETURN_REQUESTED") return { error: "This return is not pending" }
  if (!rejectionReason.trim()) return { error: "A rejection reason is required" }

  await prisma.orderReturn.update({
    where: { orderId },
    data: {
      status: "REJECTED",
      rejectionReason: rejectionReason.trim(),
      resolvedByUserId: session!.user.id,
      resolvedAt: new Date(),
    },
  })
  await prisma.order.update({ where: { id: orderId }, data: { status: "RETURN_REJECTED" } })
  await prisma.orderStatusHistory.create({
    data: { orderId, fromStatus: "RETURN_REQUESTED", toStatus: "RETURN_REJECTED", changedByUserId: session!.user.id, note: rejectionReason.trim() },
  })

  revalidatePath(`/shop-owner/${order!.shopId}/orders/${orderId}`)
  revalidatePath(`/customer/orders/${orderId}`)
  revalidatePath("/admin/returns")
  return { success: true }
}

// ── Owner marks refunded ─────────────────────────────────────────────────────

export async function markRefunded(orderId: string) {
  const { error, session, order } = await requireOwnerForOrder(orderId)
  if (error) return { error }
  if (order!.status !== "RETURN_APPROVED") return { error: "Only approved returns can be refunded" }

  await prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } })
  await prisma.orderStatusHistory.create({
    data: { orderId, fromStatus: "RETURN_APPROVED", toStatus: "REFUNDED", changedByUserId: session!.user.id },
  })

  revalidatePath(`/shop-owner/${order!.shopId}/orders/${orderId}`)
  revalidatePath(`/customer/orders/${orderId}`)
  return { success: true }
}