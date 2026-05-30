# Developer Guide — 06: Shop Manager

A shop manager is created by a shop owner (you built that flow in `04-shop-owner.md`). The manager logs in, is forced to change their temporary password (`proxy.ts` handles this), and then lands on `/manager`.

A manager can do almost everything a shop owner can on a shop's **products** and **orders** — with two restrictions from the PRD:

- They **cannot remove** a product from the shop (no Remove button).
- They **cannot action returns** (no Returns tab, no approve/reject/refund).

Because of that overlap, this document is short: the manager reuses the same server actions and the same product-management component you already built. The order pages are reused too — those are built in `08-fulfillment.md`.

---

## What You Are Building

```
/manager                       ← Dashboard: all shops this manager is assigned to
/manager/[shopId]              ← Per-shop landing (redirects to Products)
/manager/[shopId]/products     ← Manage products (add / update — NO remove)
/manager/[shopId]/orders       ← Orders list (built in 08-fulfillment.md)
```

---

## Why No New Server Actions

Look back at `actions/shop-product.actions.ts` from doc 04. Every function calls `requireShopAccess(shopId)`, which already allows **both** `SHOP_OWNER` (who owns the shop) and `SHOP_MANAGER` (who is assigned to it):

```typescript
// (already written in 04-shop-owner.md — shown here for reference)
async function requireShopAccess(shopId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }

  const role = session.user.role as string
  if (role === "SHOP_OWNER") {
    const shop = await prisma.shop.findFirst({ where: { id: shopId, ownerId: session.user.id } })
    if (!shop) return { error: "Shop not found" as const, session: null }
  } else if (role === "SHOP_MANAGER") {
    const assignment = await prisma.shopManager.findFirst({ where: { shopId, userId: session.user.id } })
    if (!assignment) return { error: "Not assigned to this shop" as const, session: null }
  } else {
    return { error: "Forbidden" as const, session: null }
  }
  return { error: null, session }
}
```

And `removeProductFromShop` already hard-blocks managers:

```typescript
if (session.user.role !== "SHOP_OWNER") {
  return { error: "Only shop owners can remove products" }
}
```

So the security is already correct. The manager pages just render the existing UI with the Remove button hidden.

---

## Step 1 — Manager Layout and Navbar

```tsx
// app/manager/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ManagerNavbar } from "@/components/manager/navbar"

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "SHOP_MANAGER") redirect("/unauthorized")

  return (
    <div className="min-h-screen flex flex-col">
      <ManagerNavbar userName={session.user.name} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

```tsx
// components/manager/navbar.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function ManagerNavbar({ userName }: { userName: string }) {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    toast.success("Signed out")
    router.push("/signin")
  }

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/manager" className="font-semibold text-lg">
            🛒 Grocery Market
          </Link>
          <Link href="/manager" className="text-sm text-muted-foreground hover:text-foreground">
            My Shops
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
            {userName}
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
```

```bash
mkdir -p components/manager
```

---

## Step 2 — Manager Dashboard

The dashboard lists every shop the manager is assigned to (via the `ShopManager` junction).

```tsx
// app/manager/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ManagerDashboard() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const assignments = await prisma.shopManager.findMany({
    where: { userId: session.user.id },
    include: {
      shop: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { shopProducts: true, orders: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">My Shops</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {assignments.length} {assignments.length === 1 ? "shop" : "shops"} you manage
      </p>

      {assignments.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            You are not assigned to any shops yet. Ask a shop owner to add you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map(({ id, shop }) => (
            <Link key={id} href={`/manager/${shop.id}/products`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{shop.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit">{shop.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">Owner: {shop.owner.name}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{shop._count.shopProducts} products</span>
                    <span>{shop._count.orders} orders</span>
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

---

## Step 3 — Per-Shop Layout and Sub-Nav

This layout guards that the logged-in manager is actually assigned to the shop in the URL. It renders a two-tab sub-nav: **Products** and **Orders**.

```tsx
// app/manager/[shopId]/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ManagerShopSubNav } from "@/components/manager/shop-subnav"

export default async function ManagerShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "SHOP_MANAGER") redirect("/unauthorized")

  // Confirm this manager is assigned to this shop
  const assignment = await prisma.shopManager.findFirst({
    where: { shopId, userId: session.user.id },
    include: { shop: { select: { name: true } } },
  })
  if (!assignment) notFound()

  return (
    <div>
      <ManagerShopSubNav shopId={shopId} shopName={assignment.shop.name} />
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  )
}
```

```tsx
// components/manager/shop-subnav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/orders" },
]

export function ManagerShopSubNav({ shopId, shopName }: { shopId: string; shopName: string }) {
  const pathname = usePathname()
  const base = `/manager/${shopId}`

  return (
    <div className="border-b bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 pt-3">
          <Link href="/manager" className="text-sm text-muted-foreground hover:text-foreground mr-3">
            ← All Shops
          </Link>
          <span className="text-sm font-semibold mr-4">{shopName}</span>

          {tabs.map((tab) => {
            const href = `${base}${tab.href}`
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "px-3 py-2 text-sm border-b-2 transition-colors",
                  isActive
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

---

## Step 4 — `/manager/[shopId]` Landing Redirect

Visiting a shop should drop the manager straight onto the Products tab.

```tsx
// app/manager/[shopId]/page.tsx
import { redirect } from "next/navigation"

export default async function ManagerShopHome({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  redirect(`/manager/${shopId}/products`)
}
```

---

## Step 5 — Manager Products Page (Reuses the Owner Component)

The product manager UI you built in doc 04 (`ShopProductsManager`) already takes an `isOwner` prop that controls whether the Remove button shows. The manager page renders it with `isOwner={false}`.

```tsx
// app/manager/[shopId]/products/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ShopProductsManager } from "@/app/shop-owner/[shopId]/products/_components/shop-products-manager"

export default async function ManagerProductsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  // Confirm assignment (the layout already did this, but server actions verify again too)
  const assignment = await prisma.shopManager.findFirst({
    where: { shopId, userId: session.user.id },
  })
  if (!assignment) notFound()

  const inventory = await prisma.shopProduct.findMany({
    where: { shopId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <ShopProductsManager
        shopId={shopId}
        initialInventory={inventory}
        isOwner={false}
      />
    </div>
  )
}
```

> **About the import path.** `ShopProductsManager` is a plain React module that happens to live in the shop-owner route folder. Importing it into a manager page is perfectly fine — colocated `_components` are still importable from anywhere. If you prefer, you can move the file to `components/shop/shop-products-manager.tsx` and update both import sites; the behaviour is identical.

When `isOwner` is `false`, the component hides the Remove button (see the `{isOwner && (...)}` guard in doc 04). Add and Edit still work, and `revalidatePath` in `addProductToShop` / `updateShopProduct` already revalidates both `/shop-owner/${shopId}/products` **and** `/manager/${shopId}/products`, so the owner and manager always see the same inventory.

---

## Step 6 — Verify the Manager Flow

```bash
npm run dev
```

1. **As a shop owner**, go to `/shop-owner/[shopId]/managers` and add a manager with a brand-new email → copy the temporary password shown.
2. **Sign out**, then **sign in** as that manager → you are forced to `/change-password` → set a new password → land on `/manager`.
3. **Dashboard** shows the shop you were assigned to.
4. **Open the shop** → Products tab → search the catalog, add a product, edit its stock/price. Confirm there is **no Remove button**.
5. Open the same shop as the **owner** in another browser → the product the manager added is there (shared inventory).
6. Try visiting another shop's URL you are *not* assigned to (`/manager/<other-shop-id>/products`) → you get a 404 (the layout's assignment check blocks it).

The **Orders** tab is wired up in the next-but-one document — `08-fulfillment.md` builds the order list and detail pages shared by owners and managers.

---

## File Reference — Files Created in This Document

```
components/manager/
  navbar.tsx
  shop-subnav.tsx
app/manager/
  layout.tsx
  page.tsx
  [shopId]/
    layout.tsx
    page.tsx
    products/page.tsx
```

No new server actions were needed — the manager reuses `actions/shop-product.actions.ts` from doc 04.

Now proceed to `07-customer-shopping.md`.
