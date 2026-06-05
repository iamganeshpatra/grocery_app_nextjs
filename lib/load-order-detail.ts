import { prisma } from "@/lib/db"
import type { OrderDetailData, AddressSnapshot } from "@/components/shop/order-detail"

export async function loadOrderDetail(orderId: string): Promise<OrderDetailData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: { select: { name: true } },
      user: { select: { name: true } },
      items: true,
      statusHistory: {
        orderBy: { changedAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  })
  if (!order) return null

  let address: AddressSnapshot
  try {
    address = JSON.parse(order.addressSnapshot)
  } catch {
    address = { fullName: "", phone: "", line: "", city: "", state: "", pincode: "" }
  }

  return {
    id: order.id,
    shopName: order.shop.name,
    status: order.status,
    totalAmount: order.totalAmount,
    cancellationNote: order.cancellationNote,
    createdAt: order.createdAt.toISOString(),
    customerName: order.user.name,
    address,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    history: order.statusHistory.map((h) => ({
      toStatus: h.toStatus,
      changedAt: h.changedAt.toISOString(),
      changedByName: h.changedBy.name,
    })),
  }
}