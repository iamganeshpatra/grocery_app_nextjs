import type { OrderStatus } from "@/app/generated/prisma/enums"

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "DISPATCHED",
  DISPATCHED: "DELIVERED",
}

export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "Confirm Order",
  CONFIRMED: "Start Preparing",
  PREPARING: "Mark Dispatched",
  DISPATCHED: "Mark Delivered",
}

export const CANCELLABLE: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
]