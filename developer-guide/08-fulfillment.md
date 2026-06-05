# Developer Guide — 08: Order Fulfillment

This document gives shop staff (owners **and** managers) the ability to receive and progress orders through their lifecycle:

```
PENDING → CONFIRMED → PREPARING → DISPATCHED → DELIVERED
```

…plus the ability to **cancel** an order (before it is dispatched), which restores stock. Every transition is written to `OrderStatusHistory` with the timestamp and who made it.

The owner and manager order screens are nearly identical, so both reuse the same components. The only difference — return actions — is owner-only and is added in `09-customer-orders-returns.md`.

---

## What You Are Building

```
/shop-owner/[shopId]/orders                ← Orders list (tabs: All/Pending/Active/Completed/Returns)
/shop-owner/[shopId]/orders/[orderId]      ← Order detail + fulfillment actions
/manager/[shopId]/orders                   ← Orders list (tabs: All/Pending/Active/Completed)
/manager/[shopId]/orders/[orderId]         ← Order detail + fulfillment actions
```

---

## Step 1 — Add Fulfillment Actions to order.actions.ts

Open `actions/order.actions.ts` (created in doc 07) and **append** these functions. They share the file with `placeOrder`.

```typescript
// Append to actions/order.actions.ts

import type { OrderStatus } from "@/app/generated/prisma/enums"

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
```

> **Imports:** `auth`, `headers`, `prisma`, and `revalidatePath` are already imported at the top of `order.actions.ts` from doc 07. Only the `OrderStatus` type import is new — add it with the other imports at the top of the file.

---

## Step 2 — Shared Status Badge and Timeline

These two presentational components are used by every order screen — staff and customer. They are Server Components (no `"use client"`).

```tsx
// components/shop/status-badge.tsx
import { Badge } from "@/components/ui/badge"

const STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  DISPATCHED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  RETURN_APPROVED: "bg-teal-100 text-teal-800",
  RETURN_REJECTED: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-gray-200 text-gray-800",
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={STYLES[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>
}
```

```tsx
// components/shop/status-timeline.tsx
const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"] as const

type HistoryEntry = { toStatus: string; changedAt: string; changedByName: string }

export function StatusTimeline({
  currentStatus,
  history,
}: {
  currentStatus: string
  history: HistoryEntry[]
}) {
  // Map each step to its history entry (if reached)
  const reached = new Map(history.map((h) => [h.toStatus, h]))
  const currentIndex = STEPS.indexOf(currentStatus as (typeof STEPS)[number])
  const isCancelled = currentStatus === "CANCELLED"

  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => {
        const entry = reached.get(step)
        const done = currentIndex >= i && !isCancelled
        return (
          <li key={step} className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                done ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <div>
              <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>{step}</p>
              {entry && (
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleString("en-IN")} · {entry.changedByName}
                </p>
              )}
            </div>
          </li>
        )
      })}
      {isCancelled && (
        <li className="flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">✕</div>
          <p className="text-sm font-medium text-red-700">CANCELLED</p>
        </li>
      )}
    </ol>
  )
}
```

```bash
mkdir -p components/shop
```

---

## Step 3 — Shared Orders Tab Bar and Table

The list page filters by a `?tab=` query param. The tab bar (client) updates the URL; the table (server) renders whatever rows the page passes in.

```tsx
// components/shop/orders-tab-bar.tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

const TABS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
]

export function OrdersTabBar({ basePath, showReturns }: { basePath: string; showReturns?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get("tab") ?? "all"
  const tabs = showReturns ? [...TABS, { label: "Returns", value: "returns" }] : TABS

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {tabs.map((t) => (
        <Button
          key={t.value}
          size="sm"
      </table>
    </div>
  );
}

          variant={current === t.value ? "default" : "outline"}
          onClick={() => router.push(`${basePath}?tab=${t.value}`)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
```

```tsx
// components/shop/orders-table.tsx
import Link from "next/link"
import { StatusBadge } from "./status-badge"
import { formatDistanceToNow } from "date-fns"

export type OrderRow = {
  id: string
  customerName: string
  itemCount: number
  totalAmount: number
  status: string
  createdAt: string
}

export function OrdersTable({ orders, basePath }: { orders: OrderRow[]; basePath: string }) {
  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        No orders here yet.
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">Order</th>
            <th className="text-left p-3">Customer</th>
            <th className="text-left p-3">Items</th>
            <th className="text-left p-3">Total</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Placed</th>
            <th className="text-right p-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t hover:bg-muted/30">
              <td className="p-3 font-mono text-xs">#{o.id.slice(-6)}</td>
              <td className="p-3">{o.customerName}</td>
              <td className="p-3">{o.itemCount}</td>
              <td className="p-3">₹{o.totalAmount}</td>
              <td className="p-3"><StatusBadge status={o.status} /></td>
              <td className="p-3 text-muted-foreground">
                {formatDistanceToNow(new Date(o.createdAt), { addSuffix: true })}
              </td>
              <td className="p-3 text-right">
                <Link href={`${basePath}/${o.id}`} className="text-sm underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

> `date-fns` is already a dependency (see `package.json`). `formatDistanceToNow` renders "2 hours ago"-style timestamps.

---

## Step 4 — A Reusable Tab → Status Filter

Both the owner and manager list pages translate a `tab` value into a Prisma `where` clause. Put that logic in one helper so it never drifts.

```typescript
// lib/order-filters.ts
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
```

---

## Step 5 — Shared Order Detail (Fulfillment View)

This client component renders the order, the timeline, and the action panel. It is used by both owner and manager detail pages. (In doc 09 you will replace it with a final version that adds the customer-return section — owner only.)

```tsx
// components/shop/order-detail.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { advanceOrderStatus, cancelOrderByStaff, NEXT_ACTION_LABEL } from "@/actions/order.actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { StatusTimeline } from "./status-timeline"

export type OrderItem = { id: string; productName: string; quantity: number; unitPrice: number; subtotal: number }
export type AddressSnapshot = { fullName: string; phone: string; line: string; city: string; state: string; pincode: string }
export type HistoryEntry = { toStatus: string; changedAt: string; changedByName: string }

export type OrderDetailData = {
  id: string
  shopName: string
  status: string
  totalAmount: number
  cancellationNote: string | null
  createdAt: string
  customerName: string
  address: AddressSnapshot
  items: OrderItem[]
  history: HistoryEntry[]
}

const CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"]

export function OrderDetail({ order }: { order: OrderDetailData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCancel, setShowCancel] = useState(false)
  const [note, setNote] = useState("")

  const nextLabel = NEXT_ACTION_LABEL[order.status as keyof typeof NEXT_ACTION_LABEL]

  function advance() {
    startTransition(async () => {
      const result = await advanceOrderStatus(order.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Order moved to ${result.data!.status}`)
      router.refresh()
    })
  }

  function cancel() {
    if (!note.trim()) {
      toast.error("Enter a cancellation note")
      return
    }
    startTransition(async () => {
      const result = await cancelOrderByStaff(order.id, note)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Order cancelled — stock restored")
      setShowCancel(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(-6)}</h1>
          <p className="text-sm text-muted-foreground">
            {order.shopName} · {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + address */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-muted-foreground">× {item.quantity}</td>
                      <td className="py-2 text-right">₹{item.unitPrice}</td>
                      <td className="py-2 text-right font-medium">₹{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between border-t mt-2 pt-2 font-semibold">
                <span>Total</span><span>₹{order.totalAmount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Delivery Address</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.address.fullName} · {order.address.phone}</p>
              <p className="text-muted-foreground">
                {order.address.line}, {order.address.city}, {order.address.state} - {order.address.pincode}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: timeline + actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent>
              <StatusTimeline currentStatus={order.status} history={order.history} />
              {order.status === "CANCELLED" && order.cancellationNote && (
                <p className="text-xs text-red-700 mt-3">Note: {order.cancellationNote}</p>
              )}
            </CardContent>
          </Card>

          {/* Action panel */}
          {(nextLabel || CANCELLABLE.includes(order.status)) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {nextLabel && (
                  <Button className="w-full" onClick={advance} disabled={isPending}>{nextLabel}</Button>
                )}

                {CANCELLABLE.includes(order.status) && (
                  !showCancel ? (
                    <Button variant="outline" className="w-full" onClick={() => setShowCancel(true)}>
                      Cancel Order
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        placeholder="Reason for cancellation (required)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={cancel} disabled={isPending}>
                          Confirm Cancel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowCancel(false)}>Back</Button>
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Step 6 — A Shared Loader for Order Detail

Both detail pages need the same data shape. Put the query + serialization in one helper so the owner and manager pages stay tiny.

```typescript
// lib/load-order-detail.ts
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
```

---

## Step 7 — Shop Owner: Orders List + Detail

First, update the owner's sub-nav to include an **Orders** tab. Open `components/shop-owner/shop-subnav.tsx` (from doc 04) and add Orders to the `tabs` array:

```tsx
// components/shop-owner/shop-subnav.tsx — update the tabs array only
const tabs = [
  { label: "Dashboard", href: "" },
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/orders" },
  { label: "Managers", href: "/managers" },
]
```

Now the list page:

```tsx
// app/shop-owner/[shopId]/orders/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { statusesForTab } from "@/lib/order-filters"
import { OrdersTabBar } from "@/components/shop/orders-tab-bar"
import { OrdersTable } from "@/components/shop/orders-table"

export default async function ShopOwnerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { shopId } = await params
  const { tab = "all" } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const shop = await prisma.shop.findFirst({ where: { id: shopId, ownerId: session.user.id } })
  if (!shop) notFound()

  const statuses = statusesForTab(tab)
  const orders = await prisma.order.findMany({
    where: { shopId, ...(statuses ? { status: { in: statuses } } : {}) },
    include: { user: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <OrdersTabBar basePath={`/shop-owner/${shopId}/orders`} showReturns />
      <OrdersTable
        basePath={`/shop-owner/${shopId}/orders`}
        orders={orders.map((o) => ({
          id: o.id,
          customerName: o.user.name,
          itemCount: o._count.items,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
```

```tsx
// app/shop-owner/[shopId]/orders/[orderId]/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { loadOrderDetail } from "@/lib/load-order-detail"
import { OrderDetail } from "@/components/shop/order-detail"

export default async function ShopOwnerOrderDetailPage({
  params,
}: {
  params: Promise<{ shopId: string; orderId: string }>
}) {
  const { shopId, orderId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  // Confirm the order belongs to a shop this owner owns
  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId, shop: { ownerId: session.user.id } },
    select: { id: true },
  })
  if (!order) notFound()

  const data = await loadOrderDetail(orderId)
  if (!data) notFound()

  return <OrderDetail order={data} />
}
```

---

## Step 8 — Manager: Orders List + Detail

The manager screens are the same, minus the Returns tab. They live under `/manager/[shopId]/orders` (the sub-nav tab was already added in doc 06).

```tsx
// app/manager/[shopId]/orders/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { statusesForTab } from "@/lib/order-filters"
import { OrdersTabBar } from "@/components/shop/orders-tab-bar"
import { OrdersTable } from "@/components/shop/orders-table"

export default async function ManagerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { shopId } = await params
  const { tab = "all" } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const assignment = await prisma.shopManager.findFirst({ where: { shopId, userId: session.user.id } })
  if (!assignment) notFound()

  const statuses = statusesForTab(tab)
  const orders = await prisma.order.findMany({
    where: { shopId, ...(statuses ? { status: { in: statuses } } : {}) },
    include: { user: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      {/* No Returns tab for managers */}
      <OrdersTabBar basePath={`/manager/${shopId}/orders`} />
      <OrdersTable
        basePath={`/manager/${shopId}/orders`}
        orders={orders.map((o) => ({
          id: o.id,
          customerName: o.user.name,
          itemCount: o._count.items,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
```

```tsx
// app/manager/[shopId]/orders/[orderId]/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { loadOrderDetail } from "@/lib/load-order-detail"
import { OrderDetail } from "@/components/shop/order-detail"

export default async function ManagerOrderDetailPage({
  params,
}: {
  params: Promise<{ shopId: string; orderId: string }>
}) {
  const { shopId, orderId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const assignment = await prisma.shopManager.findFirst({ where: { shopId, userId: session.user.id } })
  if (!assignment) notFound()

  const order = await prisma.order.findFirst({ where: { id: orderId, shopId }, select: { id: true } })
  if (!order) notFound()

  const data = await loadOrderDetail(orderId)
  if (!data) notFound()

  return <OrderDetail order={data} />
}
```

> The manager fulfillment actions are the *same* server actions — `advanceOrderStatus` and `cancelOrderByStaff` already accept managers via `requireShopStaffForOrder`. No manager-specific code is needed.

---

## Step 9 — Verify Fulfillment

```bash
npm run dev
```

You need a placed order — if you don't have one, follow doc 07 to checkout as a customer first.

1. **As the shop owner**, go to `/shop-owner/[shopId]/orders` → the new order shows under **Pending**.
2. **Open it** → see items (snapshots), the delivery address (from the snapshot), and the status timeline.
3. **Click "Confirm Order"** → status → CONFIRMED, a new timeline entry appears with your name and the time.
4. Continue: **Start Preparing → Mark Dispatched → Mark Delivered.** The "Active" and "Completed" tabs reflect each move.
5. **Cancel flow:** place another order, open it while PENDING, click **Cancel Order**, enter a note, confirm → status CANCELLED, and the customer's stock is restored (check the products page).
6. **As a manager** of the same shop, repeat: `/manager/[shopId]/orders` → you can advance and cancel, but there is **no Returns tab**.
7. **Customer view:** as the customer, open `/customer/orders/[orderId]` (built in doc 09) — the timeline mirrors what staff did.

---

## File Reference — Files Created / Updated in This Document

```
actions/order.actions.ts                 (appended: advanceOrderStatus, cancelOrderByStaff, NEXT_ACTION_LABEL)
lib/order-filters.ts                      (new)
lib/load-order-detail.ts                  (new)
components/shop-owner/shop-subnav.tsx     (updated: added Orders tab)
components/shop/
  status-badge.tsx
  status-timeline.tsx
  orders-tab-bar.tsx
  orders-table.tsx
  order-detail.tsx                        (replaced with a final version in doc 09)
app/shop-owner/[shopId]/orders/
  page.tsx
  [orderId]/page.tsx
app/manager/[shopId]/orders/
  page.tsx
  [orderId]/page.tsx
```

Now proceed to `09-customer-orders-returns.md`.
