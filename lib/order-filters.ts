import type { OrderStatus } from "@/app/generated/prisma/enums"

export function statusesForTab(tab: string): OrderStatus[] | undefined {
  switch (tab) {
    case "pending":
      return ["PENDING"]
    case "active":
      return ["CONFIRMED", "PREPARING", "DISPATCHED"]
    case "completed":
      return ["DELIVERED", "CANCELLED", "REFUNDED"]
    case "returns":
      return ["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED"]
    default:
      return undefined // "all"
  }
}
export function customerStatusesForTab(tab: string): OrderStatus[] | undefined {
  switch (tab) {
    case "active":
      return ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED"]
    case "completed":
      return ["DELIVERED", "REFUNDED"]
    case "cancelled":
      return ["CANCELLED"]
    case "returns":
      return ["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED"]
    default:
      return undefined // "all"
  }
}