"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { OrderStatus } from "@/app/generated/prisma/enums"

async function requireCustomer() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "CUSTOMER") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

export async function placeOrder(addressId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }
  const userId = session!.user.id

  // 1. Load the address and confirm it belongs to this customer
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!address) return { error: "Select a valid delivery address" }

  // 2. Load the cart with product + shop context
  const cartItems = await prisma.cart.findMany({
    where: { userId },
    include: { product: true },
  })
  if (cartItems.length === 0) return { error: "Your cart is empty" }

  // 3. Re-validate stock against the live ShopProduct rows
  const invalid: { name: string; available: number; wanted: number }[] = []
  const priced: {
    productId: string
    shopId: string
    productName: string
    unitPrice: number
    quantity: number
    subtotal: number
  }[] = []

  for (const item of cartItems) {
    const sp = await prisma.shopProduct.findUnique({
      where: { shopId_productId: { shopId: item.shopId, productId: item.productId } },
    })
    if (!sp || sp.stock < item.quantity) {
      invalid.push({ name: item.product.name, available: sp?.stock ?? 0, wanted: item.quantity })
      continue
    }
    priced.push({
      productId: item.productId,
      shopId: item.shopId,
      productName: item.product.name,
      unitPrice: sp.price,
      quantity: item.quantity,
      subtotal: sp.price * item.quantity,
    })
  }

  if (invalid.length > 0) {
    return { error: "Some items are out of stock. Adjust your cart and try again.", invalid }
  }

  // 4. Group priced items by shopId
  const byShop = new Map<string, typeof priced>()
  for (const p of priced) {
    const list = byShop.get(p.shopId) ?? []
    list.push(p)
    byShop.set(p.shopId, list)
  }

  // 5. Build a frozen address snapshot string
  const addressSnapshot = JSON.stringify({
    fullName: address.fullName,
    phone: address.phone,
    line: `${address.houseNo}, ${address.area}${address.landmark ? `, ${address.landmark}` : ""}`,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  })

  // 6. Create one Order per shop
  const createdOrders: { id: string; shopName: string; total: number }[] = []

  for (const [shopId, items] of byShop) {
    const total = items.reduce((sum, i) => sum + i.subtotal, 0)
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } })

    const order = await prisma.order.create({
      data: {
        shopId,
        userId,
        addressId,
        addressSnapshot,
        totalAmount: total,
        status: "PENDING",
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            shopId: i.shopId,
            productName: i.productName, // snapshot
            unitPrice: i.unitPrice,     // snapshot
            quantity: i.quantity,
            subtotal: i.subtotal,       // snapshot
          })),
        },
      },
    })

    // Initial status history entry (fromStatus = null → PENDING)
    await prisma.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: null, toStatus: "PENDING", changedByUserId: userId },
    })

    // Decrement stock for each item in this shop's order
    for (const i of items) {
      await prisma.shopProduct.update({
        where: { shopId_productId: { shopId: i.shopId, productId: i.productId } },
        data: { stock: { decrement: i.quantity } },
      })
    }

    createdOrders.push({ id: order.id, shopName: shop?.name ?? "Shop", total })
  }

  // 7. Clear the cart
  await prisma.cart.deleteMany({ where: { userId } })

  revalidatePath("/customer/cart")
  revalidatePath("/customer/orders")
  return { data: { orders: createdOrders } }
}


// Linear forward transitions for shop staff
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "DISPATCHED",
  DISPATCHED: "DELIVERED",
}

// Human-friendly label for the "next action" button
export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "Confirm Order",
  CONFIRMED: "Start Preparing",
  PREPARING: "Mark Dispatched",
  DISPATCHED: "Mark Delivered",
}

// Statuses at which an order may still be cancelled (before dispatch)
const CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"]

// Verify the caller is the shop owner OR an assigned manager for this order's shop
async function requireShopStaffForOrder(orderId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null, order: null }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: { select: { ownerId: true } }, items: true },
  })
  if (!order) return { error: "Order not found" as const, session: null, order: null }

  const role = session.user.role as string
  if (role === "SHOP_OWNER") {
    if (order.shop.ownerId !== session.user.id) {
      return { error: "Not your shop" as const, session: null, order: null }
    }
  } else if (role === "SHOP_MANAGER") {
    const assigned = await prisma.shopManager.findFirst({
      where: { shopId: order.shopId, userId: session.user.id },
    })
    if (!assigned) return { error: "Not assigned to this shop" as const, session: null, order: null }
  } else {
    return { error: "Forbidden" as const, session: null, order: null }
  }

  return { error: null, session, order }
}

function revalidateOrder(shopId: string, orderId: string) {
  revalidatePath(`/shop-owner/${shopId}/orders`)
  revalidatePath(`/shop-owner/${shopId}/orders/${orderId}`)
  revalidatePath(`/manager/${shopId}/orders`)
  revalidatePath(`/manager/${shopId}/orders/${orderId}`)
  revalidatePath(`/customer/orders/${orderId}`)
}

export async function advanceOrderStatus(orderId: string) {
  const { error, session, order } = await requireShopStaffForOrder(orderId)
  if (error) return { error }

  const next = NEXT_STATUS[order!.status]
  if (!next) return { error: "This order cannot be advanced further" }

  await prisma.order.update({ where: { id: orderId }, data: { status: next } })
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: order!.status,
      toStatus: next,
      changedByUserId: session!.user.id,
    },
  })

  revalidateOrder(order!.shopId, orderId)
  return { data: { status: next } }
}

export async function cancelOrderByStaff(orderId: string, note: string) {
  const { error, session, order } = await requireShopStaffForOrder(orderId)
  if (error) return { error }

  if (!CANCELLABLE.includes(order!.status)) {
    return { error: "This order can no longer be cancelled" }
  }
  if (!note.trim()) return { error: "A cancellation note is required" }

  // Restore stock for every item in the order
  for (const item of order!.items) {
    await prisma.shopProduct.updateMany({
      where: { shopId: item.shopId, productId: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancellationNote: note.trim() },
  })
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: order!.status,
      toStatus: "CANCELLED",
      changedByUserId: session!.user.id,
      note: note.trim(),
    },
  })

  revalidateOrder(order!.shopId, orderId)
  return { success: true }
}

export async function customerCancelOrder(orderId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session!.user.id },
    include: { items: true },
  })
  if (!order) return { error: "Order not found" }

  // Customers may only cancel BEFORE the shop confirms — i.e. at PENDING
  if (order.status !== "PENDING") {
    return { error: "This order can no longer be cancelled" }
  }

  // Restore stock
  for (const item of order.items) {
    await prisma.shopProduct.updateMany({
      where: { shopId: item.shopId, productId: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancellationNote: "Cancelled by customer." },
  })
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: "PENDING",
      toStatus: "CANCELLED",
      changedByUserId: session!.user.id,
      note: "Cancelled by customer.",
    },
  })

  revalidatePath("/customer/orders")
  revalidatePath(`/customer/orders/${orderId}`)
  revalidatePath(`/shop-owner/${order.shopId}/orders`)
  return { success: true }
}