# Developer Guide — 09: Order Tracking, Returns & Feedback

This final feature document closes the loop after delivery. It covers:

- **Customer order tracking** — order history (tabbed) and a detail page with the status timeline
- **Customer cancel** — cancel a `PENDING` order (restores stock)
- **Returns** — the customer requests a return (7-day window, server-enforced); the shop owner approves / rejects / refunds
- **Feedback** — a star rating + comment after delivery, shown on the product page

When this document is done, the platform is feature-complete against the PRD.

---

## What You Are Building

```
/customer/orders                      ← Order history (All/Active/Completed/Cancelled/Returns)
/customer/orders/[orderId]            ← Detail: timeline, cancel, return, feedback
/customer/orders/[orderId]/return     ← Return request form
/customer/orders/[orderId]/feedback   ← Feedback form
```

Plus the **owner-side return management** added to the order detail you built in doc 08.

---

## Step 1 — Customer Cancel Action

Append to `actions/order.actions.ts`:

```typescript
// Append to actions/order.actions.ts

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
```

> `requireCustomer`, `prisma`, `revalidatePath`, etc. are already imported in `order.actions.ts` from doc 07.

---

## Step 2 — Return Server Actions

Create `actions/return.actions.ts`:

```typescript
// actions/return.actions.ts
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
```

---

## Step 3 — Feedback Server Action

Create `actions/review.actions.ts`:

```typescript
// actions/review.actions.ts
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
```

> **One review per order.** The `ProductReview` table has a unique constraint on `(customerId, orderId)` (see `02-schema.md`), so we store exactly one review row per order, keyed to the order's shop and its first product. The product detail page (doc 07) averages reviews by `shopId` + `productId` — this gives each shop a rating built from its delivered orders.

---

## Step 4 — Customer Order Filter Helper

Add a customer-specific tab → status mapping to `lib/order-filters.ts` (created in doc 08):

```typescript
// Append to lib/order-filters.ts

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
```

---

## Step 5 — Customer Order History Page

```tsx
// app/customer/orders/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { customerStatusesForTab } from "@/lib/order-filters"
import { StatusBadge } from "@/components/shop/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CustomerOrdersTabs } from "./_components/customer-orders-tabs"

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = "all" } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const statuses = customerStatusesForTab(tab)
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, ...(statuses ? { status: { in: statuses } } : {}) },
    include: { shop: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      <CustomerOrdersTabs current={tab} />

      {orders.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20 mt-4">
          <p className="text-muted-foreground mb-4">You haven&apos;t placed any orders yet.</p>
          <Button asChild><Link href="/customer">Start Shopping</Link></Button>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/customer/orders/${o.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex justify-between items-center gap-4">
                  <div>
                    <p className="font-medium">{o.shop.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      #{o.id.slice(-6)} · {o._count.items} item{o._count.items === 1 ? "" : "s"} ·{" "}
                      {new Date(o.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">₹{o.totalAmount}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

```tsx
// app/customer/orders/_components/customer-orders-tabs.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Returns", value: "returns" },
]

export function CustomerOrdersTabs({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={current === t.value ? "default" : "outline"}
          onClick={() => router.push(`/customer/orders?tab=${t.value}`)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
```

---

## Step 6 — Customer Order Detail Page

The page computes three flags server-side — whether the return window is open, whether a review exists, and whether a return exists — and hands them to a client view.

```tsx
// app/customer/orders/[orderId]/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { CustomerOrderView } from "./_components/customer-order-view"

const RETURN_WINDOW_DAYS = 7

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: {
      shop: { select: { name: true } },
      items: true,
      statusHistory: { orderBy: { changedAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      returnRequest: true,
    },
  })
  if (!order) notFound()

  // ProductReview has no back-relation on Order (only an orderId column), so query it directly
  const review = await prisma.productReview.findUnique({
    where: { customerId_orderId: { customerId: session.user.id, orderId } },
  })

  // Return window check
  const deliveredEntry = [...order.statusHistory].reverse().find((h) => h.toStatus === "DELIVERED")
  const withinReturnWindow = deliveredEntry
    ? (Date.now() - deliveredEntry.changedAt.getTime()) / (1000 * 60 * 60 * 24) <= RETURN_WINDOW_DAYS
    : false

  let address
  try {
    address = JSON.parse(order.addressSnapshot)
  } catch {
    address = { fullName: "", phone: "", line: "", city: "", state: "", pincode: "" }
  }

  return (
    <CustomerOrderView
      order={{
        id: order.id,
        shopName: order.shop.name,
        status: order.status,
        totalAmount: order.totalAmount,
        cancellationNote: order.cancellationNote,
        createdAt: order.createdAt.toISOString(),
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
        returnRequest: order.returnRequest
          ? {
              status: order.returnRequest.status,
              reason: order.returnRequest.reason,
              rejectionReason: order.returnRequest.rejectionReason,
            }
          : null,
        review: review ? { rating: review.rating, comment: review.comment } : null,
      }}
      withinReturnWindow={withinReturnWindow}
    />
  )
}
```

```tsx
// app/customer/orders/[orderId]/_components/customer-order-view.tsx
"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { customerCancelOrder } from "@/actions/order.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shop/status-badge"
import { StatusTimeline } from "@/components/shop/status-timeline"
import { StarDisplay } from "@/components/shared/star-rating"

type Data = {
  id: string
  shopName: string
  status: string
  totalAmount: number
  cancellationNote: string | null
  createdAt: string
  address: { fullName: string; phone: string; line: string; city: string; state: string; pincode: string }
  items: { id: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[]
  history: { toStatus: string; changedAt: string; changedByName: string }[]
  returnRequest: { status: string; reason: string; rejectionReason: string | null } | null
  review: { rating: number; comment: string | null } | null
}

export function CustomerOrderView({ order, withinReturnWindow }: { order: Data; withinReturnWindow: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function cancel() {
    if (!confirm("Cancel this order? This cannot be undone.")) return
    startTransition(async () => {
      const result = await customerCancelOrder(order.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Order cancelled")
      router.refresh()
    })
  }

  const isDelivered = order.status === "DELIVERED"

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link href="/customer/orders" className="text-sm text-muted-foreground hover:text-foreground">← All Orders</Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(-6)}</h1>
          <p className="text-sm text-muted-foreground">
            {order.shopName} · {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-2">{i.productName}</td>
                  <td className="py-2 text-muted-foreground">× {i.quantity}</td>
                  <td className="py-2 text-right">₹{i.unitPrice}</td>
                  <td className="py-2 text-right font-medium">₹{i.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t mt-2 pt-2 font-semibold">
            <span>Total</span><span>₹{order.totalAmount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery Address</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{order.address.fullName} · {order.address.phone}</p>
          <p className="text-muted-foreground">
            {order.address.line}, {order.address.city}, {order.address.state} - {order.address.pincode}
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent>
          <StatusTimeline currentStatus={order.status} history={order.history} />
          {order.status === "CANCELLED" && order.cancellationNote && (
            <p className="text-xs text-red-700 mt-3">Note: {order.cancellationNote}</p>
          )}
        </CardContent>
      </Card>

      {/* Return status */}
      {order.returnRequest && (
        <Card>
          <CardHeader><CardTitle className="text-base">Return</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Reason: </span>{order.returnRequest.reason}</p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              <StatusBadge status={order.status} />
            </p>
            {order.returnRequest.status === "REJECTED" && order.returnRequest.rejectionReason && (
              <p className="text-red-700">Rejected: {order.returnRequest.rejectionReason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing review */}
      {order.review && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Feedback</CardTitle></CardHeader>
          <CardContent>
            <StarDisplay rating={order.review.rating} />
            {order.review.comment && <p className="text-sm mt-1">{order.review.comment}</p>}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {order.status === "PENDING" && (
          <Button variant="destructive" onClick={cancel} disabled={isPending}>Cancel Order</Button>
        )}

        {isDelivered && withinReturnWindow && !order.review && (
          <Button asChild><Link href={`/customer/orders/${order.id}/feedback`}>Leave Feedback</Link></Button>
        )}

        {isDelivered && withinReturnWindow && !order.returnRequest && (
          <Button variant="outline" asChild>
            <Link href={`/customer/orders/${order.id}/return`}>Request Return</Link>
          </Button>
        )}

        {isDelivered && !withinReturnWindow && !order.review && !order.returnRequest && (
          <p className="text-sm text-muted-foreground">The 7-day return and feedback window has closed.</p>
        )}
      </div>
    </div>
  )
}
```

---

## Step 7 — Return Request Page

```tsx
// app/customer/orders/[orderId]/return/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ReturnForm } from "./_components/return-form"

const RETURN_WINDOW_DAYS = 7

export default async function ReturnPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: {
      returnRequest: true,
      statusHistory: { where: { toStatus: "DELIVERED" }, orderBy: { changedAt: "desc" }, take: 1 },
      shop: { select: { name: true } },
    },
  })
  if (!order) notFound()

  // Server-side eligibility check — never trust the UI alone
  const deliveredAt = order.statusHistory[0]?.changedAt
  const eligible =
    order.status === "DELIVERED" &&
    !order.returnRequest &&
    !!deliveredAt &&
    (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24) <= RETURN_WINDOW_DAYS

  if (!eligible) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-muted-foreground">
        This order is not eligible for a return.
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Request a Return</h1>
      <p className="text-sm text-muted-foreground mb-6">Order #{order.id.slice(-6)} · {order.shop.name}</p>
      <ReturnForm orderId={order.id} />
    </div>
  )
}
```

```tsx
// app/customer/orders/[orderId]/return/_components/return-form.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { requestReturn } from "@/actions/return.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function ReturnForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error("Please give a reason")
      return
    }
    startTransition(async () => {
      const result = await requestReturn(orderId, reason, description)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Return requested")
      router.push(`/customer/orders/${orderId}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Reason <span className="text-red-500">*</span></label>
        <Input placeholder="e.g. Item damaged on arrival" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Description (optional)</label>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Submitting…" : "Submit Return Request"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
```

---

## Step 8 — Feedback Page

```tsx
// app/customer/orders/[orderId]/feedback/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { FeedbackForm } from "./_components/feedback-form"

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { shop: { select: { name: true } }, items: true },
  })
  if (!order) notFound()

  // One review per order — check the ProductReview table directly
  const existingReview = await prisma.productReview.findUnique({
    where: { customerId_orderId: { customerId: session.user.id, orderId } },
  })

  if (order.status !== "DELIVERED" || existingReview) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-muted-foreground">
        This order is not available for feedback.
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Leave Feedback</h1>
      <p className="text-sm text-muted-foreground mb-1">Order #{order.id.slice(-6)} · {order.shop.name}</p>
      <p className="text-xs text-muted-foreground mb-6">
        Reviewing: {order.items.map((i) => i.productName).join(", ")}
      </p>
      <FeedbackForm orderId={order.id} />
    </div>
  )
}
```

```tsx
// app/customer/orders/[orderId]/feedback/_components/feedback-form.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { submitReview } from "@/actions/review.actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StarPicker } from "@/components/shared/star-rating"

export function FeedbackForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      toast.error("Pick a star rating")
      return
    }
    if (comment.length > 500) {
      toast.error("Comment must be 500 characters or fewer")
      return
    }
    startTransition(async () => {
      const result = await submitReview(orderId, rating, comment)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Feedback submitted. Thank you!")
      router.push(`/customer/orders/${orderId}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Rating <span className="text-red-500">*</span></label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Comment (optional, max 500)</label>
        <Textarea rows={4} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Submitting…" : "Submit Feedback"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
```

---

## Step 9 — Add Return Management to the Owner's Order Detail

The shop owner actions returns from the **same order detail page** built in doc 08. Replace `components/shop/order-detail.tsx` with this final version. The changes from doc 08:

- The `OrderDetailData` type gains a `returnRequest` field.
- A new `canManageReturns` prop (owner-only) renders the **Approve / Reject / Mark Refunded** panel.

```tsx
// components/shop/order-detail.tsx  (final version — replaces doc 08)
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { advanceOrderStatus, cancelOrderByStaff, NEXT_ACTION_LABEL } from "@/actions/order.actions"
import { approveReturn, rejectReturn, markRefunded } from "@/actions/return.actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { StatusTimeline } from "./status-timeline"

export type OrderItem = { id: string; productName: string; quantity: number; unitPrice: number; subtotal: number }
export type AddressSnapshot = { fullName: string; phone: string; line: string; city: string; state: string; pincode: string }
export type HistoryEntry = { toStatus: string; changedAt: string; changedByName: string }
export type ReturnInfo = { status: string; reason: string; description: string | null; rejectionReason: string | null }

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
  returnRequest: ReturnInfo | null
}

const CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"]

export function OrderDetail({
  order,
  canManageReturns = false,
}: {
  order: OrderDetailData
  canManageReturns?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCancel, setShowCancel] = useState(false)
  const [note, setNote] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const nextLabel = NEXT_ACTION_LABEL[order.status as keyof typeof NEXT_ACTION_LABEL]

  function run(fn: () => Promise<{ error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await fn()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(successMsg)
      setShowCancel(false)
      setShowReject(false)
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
            {order.shopName} · {order.customerName} · {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
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

          {/* Return request details (owner) */}
          {order.returnRequest && (
            <Card>
              <CardHeader><CardTitle className="text-base">Return Request</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><span className="text-muted-foreground">Reason: </span>{order.returnRequest.reason}</p>
                {order.returnRequest.description && (
                  <p><span className="text-muted-foreground">Details: </span>{order.returnRequest.description}</p>
                )}
                {order.returnRequest.status === "REJECTED" && order.returnRequest.rejectionReason && (
                  <p className="text-red-700">Rejection reason: {order.returnRequest.rejectionReason}</p>
                )}

                {canManageReturns && order.status === "RETURN_REQUESTED" && (
                  <div className="pt-2 space-y-2">
                    <Button
                      size="sm"
                      onClick={() => run(() => approveReturn(order.id), "Return approved — stock restored")}
                      disabled={isPending}
                    >
                      Approve Return
                    </Button>
                    {!showReject ? (
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => setShowReject(true)}>
                        Reject Return
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Reason for rejection (required)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => run(() => rejectReturn(order.id, rejectReason), "Return rejected")}
                          >
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Back</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {canManageReturns && order.status === "RETURN_APPROVED" && (
                  <Button
                    size="sm"
                    onClick={() => run(() => markRefunded(order.id), "Marked as refunded")}
                    disabled={isPending}
                  >
                    Mark as Refunded
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right */}
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

          {(nextLabel || CANCELLABLE.includes(order.status)) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {nextLabel && (
                  <Button
                    className="w-full"
                    disabled={isPending}
                    onClick={() => run(() => advanceOrderStatus(order.id), "Order advanced")}
                  >
                    {nextLabel}
                  </Button>
                )}

                {CANCELLABLE.includes(order.status) && (
                  !showCancel ? (
                    <Button variant="outline" className="w-full" onClick={() => setShowCancel(true)}>Cancel Order</Button>
                  ) : (
                    <div className="space-y-2">
                      <Textarea rows={2} placeholder="Reason for cancellation (required)"
                        value={note} onChange={(e) => setNote(e.target.value)} />
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" disabled={isPending}
                          onClick={() => run(() => cancelOrderByStaff(order.id, note), "Order cancelled")}>
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

Update the shared loader to include the return request — in `lib/load-order-detail.ts` add `returnRequest: true` to the `include`, and map it into the result:

```typescript
// lib/load-order-detail.ts — changes only

// 1. Add to the include block:
//      returnRequest: true,

// 2. Add to the returned object (after `history: ...`):
//      returnRequest: order.returnRequest
//        ? {
//            status: order.returnRequest.status,
//            reason: order.returnRequest.reason,
//            description: order.returnRequest.description,
//            rejectionReason: order.returnRequest.rejectionReason,
//          }
//        : null,
```

Finally, tell the owner's order-detail page it may manage returns. In `app/shop-owner/[shopId]/orders/[orderId]/page.tsx`, pass the flag:

```tsx
// change the last line from:
//   return <OrderDetail order={data} />
// to:
return <OrderDetail order={data} canManageReturns />
```

The manager page keeps `<OrderDetail order={data} />` — without `canManageReturns`, no return buttons render, which is exactly the PRD rule ("managers cannot action returns").

---

## Step 10 — Verify the Full Loop

```bash
npm run dev
```

Run the entire lifecycle end to end:

1. **Customer** places an order (doc 07).
2. **Shop owner** confirms → prepares → dispatches → **delivers** (doc 08).
3. **Customer** opens `/customer/orders/[orderId]`:
   - **Leave Feedback** → pick stars, write a comment, submit → it shows on the order and on the product page (per-shop rating).
   - **Request Return** → enter a reason → status becomes RETURN_REQUESTED.
4. **Shop owner** opens the order (Returns tab) → reads the reason → **Approve Return** (stock restored) → **Mark as Refunded**.
   - Or **Reject Return** with a reason → the customer sees the rejection on their order detail.
5. **Manager** opens the same order → confirms there are **no** return buttons.
6. **Customer cancel:** place a fresh order, open it while PENDING → **Cancel Order** → stock restored, status CANCELLED with "Cancelled by customer."
7. **7-day window:** the Request Return / Leave Feedback buttons disappear once the delivery is older than 7 days (the server also rejects late attempts).
8. **Admin** → `/admin/returns` now lists every return with its status.

---

## File Reference — Files Created / Updated in This Document

```
actions/order.actions.ts                 (appended: customerCancelOrder)
actions/return.actions.ts                (new)
actions/review.actions.ts                (new)
lib/order-filters.ts                      (appended: customerStatusesForTab)
lib/load-order-detail.ts                  (updated: include returnRequest)
components/shop/order-detail.tsx          (replaced: adds return management)
app/shop-owner/[shopId]/orders/[orderId]/page.tsx  (updated: canManageReturns)
app/customer/orders/
  page.tsx
  _components/customer-orders-tabs.tsx
  [orderId]/page.tsx
  [orderId]/_components/customer-order-view.tsx
  [orderId]/return/page.tsx
  [orderId]/return/_components/return-form.tsx
  [orderId]/feedback/page.tsx
  [orderId]/feedback/_components/feedback-form.tsx
```

---

## 🎉 The Platform Is Complete

You have now built every feature in the PRD:

| Sprint | Document | Status |
|--------|----------|--------|
| 1 — Foundation & Auth | `03-auth.md` | ✅ |
| 2 — Admin Catalog | `05-admin.md` | ✅ |
| 3 — Admin Users & Shops | `05-admin.md` | ✅ |
| 4 — Shop Owner: Shops & Managers | `04-shop-owner.md` | ✅ |
| 5 — Manage Products (Owner + Manager) | `04-shop-owner.md` + `06-manager.md` | ✅ |
| 6 — Customer: Browse, Cart, Checkout | `07-customer-shopping.md` | ✅ |
| 7 — Order Fulfillment | `08-fulfillment.md` | ✅ |
| 8 — Tracking, Returns & Feedback | `09-customer-orders-returns.md` | ✅ |

Every role can complete their full journey: the admin owns the catalog and oversees the platform; shop owners and managers run their shops and fulfill orders; customers shop, track, return, and review. Orders are immutable snapshots, stock is consistent across placement / cancellation / returns, and every status change is audited in `OrderStatusHistory`.

Do a final full-flow smoke test with all four roles signed in (use different browsers or private windows), then commit your work.
