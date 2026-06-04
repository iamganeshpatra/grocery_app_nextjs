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