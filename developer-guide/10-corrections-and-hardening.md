# Developer Guide — 10: Corrections & Hardening

By now you have built the entire platform (docs 01–09). This final document applies a set of **correctness and security fixes** found in a full end-to-end review. Each fix is a simple **find-and-replace** in a file you already created — open the file, locate the *Before* block, and replace it with the *After* block.

Work top to bottom. Each fix is labelled with a severity:

- 🔴 **Critical** — the app is broken or exploitable without it.
- 🟠 **Important** — a real correctness/security gap.
- 🟢 **Enhancement** — closes a PRD detail or improves UX.

> Nothing here changes the database schema. These are code-only edits.

---

## 🔴 Fix 1 — Manager login is broken (password hashing mismatch)

**Why:** In `04-shop-owner.md`, `addManager` stores the temporary password with **bcrypt** (`bcrypt.hash(...)`). But `lib/auth.ts` never told better-auth to use bcrypt, so better-auth defaults to **scrypt** when verifying at sign-in. A bcrypt hash never matches a scrypt check → **a manager can never log in with their temp password.** This makes better-auth use bcrypt everywhere (sign-up, the admin seed, and the manual manager account), so every account verifies consistently.

**File:** `lib/auth.ts` (created in `03-auth.md`)

**Before** — the top imports:

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./db"
```

**After:**

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
```

**Before** — the `emailAndPassword` block:

```typescript
  emailAndPassword: {
    enabled: true,
    sendResetPasswordEmail: async ({
      user,
      url,
    }: {
      user: { email: string }
      url: string
    }) => {
      // In production: integrate Resend, Nodemailer, or any SMTP provider here.
      // In development: the reset URL is printed to the terminal.
      // The developer copies the URL from the terminal and pastes it in the browser.
      console.log(`\n[DEV] Password reset link for ${user.email}:\n${url}\n`)
    },
  },
```

**After:**

```typescript
  emailAndPassword: {
    enabled: true,

    // Use bcrypt for hashing AND verification across the whole app. Required so the
    // manager temp-password flow (which writes a bcrypt hash into the account table
    // manually — see 04-shop-owner.md) verifies correctly at sign-in. Without this,
    // better-auth defaults to scrypt and those accounts could never log in.
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },

    sendResetPasswordEmail: async ({
      user,
      url,
    }: {
      user: { email: string }
      url: string
    }) => {
      // In production: integrate Resend, Nodemailer, or any SMTP provider here.
      // In development: the reset URL is printed to the terminal.
      // The developer copies the URL from the terminal and pastes it in the browser.
      console.log(`\n[DEV] Password reset link for ${user.email}:\n${url}\n`)
    },
  },
```

> If you already created accounts before this change, recreate them (or re-run the seed) so their hashes use bcrypt.

---

## 🔴 Fix 2 — Checkout can oversell stock (race condition)

**Why:** In `07-customer-shopping.md`, `placeOrder` **reads** stock to validate, then **decrements** it in a later step. Two shoppers buying the last unit can both pass the check and both decrement — and Prisma's `{ decrement }` will happily push stock negative. The fix uses a **guarded atomic decrement**: `updateMany({ where: { stock: { gte: quantity } }, data: { decrement } })` is a single SQL statement, so the database itself refuses to oversell. If anything fails, we restore the reserved stock.

**File:** `actions/order.actions.ts` → the `placeOrder` function (created in `07-customer-shopping.md`)

**Before** — everything from the `if (invalid.length > 0)` guard to the end of the function:

```typescript
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
```

**After:**

```typescript
  if (invalid.length > 0) {
    return { error: "Some items are out of stock. Adjust your cart and try again.", invalid }
  }

  // 4. ATOMICALLY reserve stock. The `stock: { gte: quantity }` guard is the key:
  //    the decrement only applies if enough stock still exists AT WRITE TIME, so two
  //    shoppers can never both buy the last unit. `updateMany` returns `count: 0`
  //    when the guard fails; if any line fails we restore what we reserved and abort.
  const reserved: typeof priced = []
  for (const i of priced) {
    const res = await prisma.shopProduct.updateMany({
      where: { shopId: i.shopId, productId: i.productId, stock: { gte: i.quantity } },
      data: { stock: { decrement: i.quantity } },
    })
    if (res.count === 0) {
      for (const r of reserved) {
        await prisma.shopProduct.updateMany({
          where: { shopId: r.shopId, productId: r.productId },
          data: { stock: { increment: r.quantity } },
        })
      }
      return {
        error: "Some items just sold out. Please review your cart and try again.",
        invalid: [{ name: i.productName, available: 0, wanted: i.quantity }],
      }
    }
    reserved.push(i)
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

  // 6. Group reserved items by shopId
  const byShop = new Map<string, typeof priced>()
  for (const p of priced) {
    const list = byShop.get(p.shopId) ?? []
    list.push(p)
    byShop.set(p.shopId, list)
  }

  // 7. Create one Order per shop. Stock is already reserved; if creation throws,
  //    restore every reserved unit so we never leave stock "sold" with no order.
  const createdOrders: { id: string; shopName: string; total: number }[] = []
  try {
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

      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: null, toStatus: "PENDING", changedByUserId: userId },
      })

      createdOrders.push({ id: order.id, shopName: shop?.name ?? "Shop", total })
    }
  } catch {
    for (const r of reserved) {
      await prisma.shopProduct.updateMany({
        where: { shopId: r.shopId, productId: r.productId },
        data: { stock: { increment: r.quantity } },
      })
    }
    return { error: "Could not place your order. Please try again." }
  }

  // 8. Clear the cart
  await prisma.cart.deleteMany({ where: { userId } })

  revalidatePath("/customer/cart")
  revalidatePath("/customer/orders")
  return { data: { orders: createdOrders } }
}
```

---

## 🟠 Fix 3 — Deactivated users aren't fully blocked

**Why:** Two gaps. (a) In `proxy.ts`, the shared routes `/profile`, `/auth-redirect`, `/change-password` are passed through **before** the `isActive` check — so a deactivated user can still reach `/profile`. (b) A deactivated user can still complete a fresh sign-in (better-auth doesn't know about our `isActive` flag). This fix moves the `isActive` check ahead of the shared-route pass-through, and bounces deactivated users at `/auth-redirect`.

### 3a — `proxy.ts`

**Before** — steps 2 through the end of the `proxy` function:

```typescript
  // 2. Always pass through the role-redirect helper and forced-change-password pages
  if (pathname === "/auth-redirect" || pathname === "/change-password" || pathname === "/profile") {
    return NextResponse.next()
  }

  // 3. Allow public routes
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
  if (isPublic) return NextResponse.next()

  // 4. Get the session
  const session = await auth.api.getSession({ headers: request.headers })

  // 5. Not logged in → redirect to sign in
  if (!session) {
    const url = new URL("/signin", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  const { role, isActive, mustChangePassword } = session.user as {
    role: string
    isActive: boolean
    mustChangePassword: boolean
  }

  // 6. Deactivated account
  if (!isActive) {
    return NextResponse.redirect(
      new URL("/unauthorized?reason=deactivated", request.url)
    )
  }

  // 7. Manager must change password before going anywhere else
  if (mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url))
  }

  // 8. Role-based route guard
  const allowedPrefix = ROLE_PREFIX[role]
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}
```

**After:**

```typescript
  // 2. Allow public routes
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
  if (isPublic) return NextResponse.next()

  // 3. Get the session
  const session = await auth.api.getSession({ headers: request.headers })

  // 4. Not logged in → redirect to sign in
  if (!session) {
    const url = new URL("/signin", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  const { role, isActive, mustChangePassword } = session.user as {
    role: string
    isActive: boolean
    mustChangePassword: boolean
  }

  // 5. Deactivated account — checked BEFORE the shared-route pass-through below,
  //    so a deactivated user cannot even reach /profile.
  if (!isActive) {
    return NextResponse.redirect(
      new URL("/unauthorized?reason=deactivated", request.url)
    )
  }

  // 6. Manager must change password before going anywhere else
  if (mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url))
  }

  // 7. Shared, role-agnostic routes — allowed for every authenticated role, but
  //    only AFTER the isActive + mustChangePassword checks above.
  if (
    pathname === "/auth-redirect" ||
    pathname === "/change-password" ||
    pathname === "/profile"
  ) {
    return NextResponse.next()
  }

  // 8. Role-based route guard
  const allowedPrefix = ROLE_PREFIX[role]
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}
```

### 3b — `app/auth-redirect/page.tsx`

**Before:**

```tsx
export default async function AuthRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/signin")
  }

  const role = session.user.role as string
  const destination = ROLE_ROUTES[role] ?? "/signin"
  redirect(destination)
}
```

**After:**

```tsx
export default async function AuthRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/signin")
  }

  // A deactivated user can still complete sign-in (better-auth doesn't know about
  // our isActive flag), so we catch them on this first hop. proxy.ts independently
  // blocks every protected route for inactive users, so the session can't be used.
  if ((session.user as { isActive?: boolean }).isActive === false) {
    redirect("/unauthorized?reason=deactivated")
  }

  const role = session.user.role as string
  const destination = ROLE_ROUTES[role] ?? "/signin"
  redirect(destination)
}
```

### 3c — `app/unauthorized/page.tsx`

Show the PRD-specified deactivation message when `reason=deactivated`.

**Before:**

```tsx
export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You do not have permission to view this page.
      </p>
      <Button asChild>
        <Link href="/signin">Back to Sign In</Link>
      </Button>
    </main>
  )
}
```

**After:**

```tsx
export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const deactivated = reason === "deactivated"

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">
        {deactivated ? "Account Deactivated" : "Access Denied"}
      </h1>
      <p className="text-muted-foreground max-w-md">
        {deactivated
          ? "Your account has been deactivated. Contact support."
          : "You do not have permission to view this page."}
      </p>
      <Button asChild>
        <Link href="/signin">Back to Sign In</Link>
      </Button>
    </main>
  )
}
```

---

## 🟠 Fix 4 — Shop-product removal isn't guarded against active orders

**Why:** PRD §12 ("Shop product delete guard") requires that a product can't be removed from a shop while it sits in an active order (PENDING → DISPATCHED). The original `removeProductFromShop` has a `// Future sprint` placeholder and deletes freely. This implements the guard.

**File:** `actions/shop-product.actions.ts` (created in `04-shop-owner.md`)

**Before** — the body of `removeProductFromShop` from the ownership check onward:

```typescript
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) return { error: "Shop not found" }

  // Future sprint: check for active orders before allowing removal
  // For now, allow removal freely

  await prisma.shopProduct.delete({ where: { id: shopProductId } })

  revalidatePath(`/shop-owner/${shopId}/products`)
  return { success: true }
}
```

**After:**

```typescript
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) return { error: "Shop not found" }

  // Find the product behind this ShopProduct row
  const shopProduct = await prisma.shopProduct.findUnique({ where: { id: shopProductId } })
  if (!shopProduct) return { error: "Product not found in this shop" }

  // PRD guard: block removal if this product is in any ACTIVE order
  // (PENDING through DISPATCHED) for this shop. Allowed once every order
  // containing it is DELIVERED, CANCELLED, or REFUNDED.
  const activeOrderItem = await prisma.orderItem.findFirst({
    where: {
      shopId,
      productId: shopProduct.productId,
      order: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED"] } },
    },
  })
  if (activeOrderItem) {
    return { error: "This product is in active orders and cannot be removed yet." }
  }

  await prisma.shopProduct.delete({ where: { id: shopProductId } })

  revalidatePath(`/shop-owner/${shopId}/products`)
  return { success: true }
}
```

---

## 🟠 Fix 5 — A customer can silently convert their account to a seller

**Why:** `completeSellerSignup` only checks "is authenticated," so any logged-in customer could invoke it and flip their own role to `SHOP_OWNER`. Because seller signup is self-service this isn't an admin escalation, but an existing customer **with orders** could convert and get locked out of `/customer`, orphaning their order history. This guard restricts the conversion to brand-new accounts.

**File:** `actions/auth.actions.ts` (created in `03-auth.md`)

**Before:**

```typescript
export async function completeSellerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "SHOP_OWNER" },
  })

  return { success: true }
}
```

**After:**

```typescript
export async function completeSellerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  const userId = session.user.id

  // Only a brand-new account (just created via /signup/seller) may become a seller.
  // This prevents an established customer from silently converting their account,
  // which would orphan their existing orders under a seller role.
  if ((session.user.role as string) !== "CUSTOMER") {
    return { error: "Role already set" }
  }
  const orderCount = await prisma.order.count({ where: { userId } })
  if (orderCount > 0) {
    return { error: "This account has order history and cannot be converted to a seller." }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "SHOP_OWNER" },
  })

  return { success: true }
}
```

> Update this in **both** places in `03-auth.md`: Step 4 and the "Full actions/auth.actions.ts" listing at the end.

---

## 🟢 Fix 6 — Shop-owner dashboards are missing PRD details

**Why:** PRD §6.2 and §9.5 ask for a **PENDING-orders badge** on each shop card, and **today's** orders/revenue on the per-shop dashboard. The originals show neither.

### 6a — PENDING badge on the shops list

**File:** `app/shop-owner/page.tsx` (created in `04-shop-owner.md`)

**Before** — the shops query include:

```tsx
  const shops = await prisma.shop.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          shopProducts: true,
          shopManagers: true,
        },
      },
    },
  })
```

**After:**

```tsx
  const shops = await prisma.shop.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          shopProducts: true,
          shopManagers: true,
          orders: { where: { status: "PENDING" } }, // PENDING-orders badge
        },
      },
    },
  })
```

**Before** — the card header:

```tsx
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {shop.category}
                  </Badge>
                </CardHeader>
```

**After:**

```tsx
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                    {shop._count.orders > 0 && (
                      <Badge className="bg-yellow-500 text-white shrink-0">
                        {shop._count.orders} pending
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {shop.category}
                  </Badge>
                </CardHeader>
```

### 6b — Today's stats on the shop dashboard

**File:** `app/shop-owner/[shopId]/page.tsx` (created in `04-shop-owner.md`)

**Before** — the query + stats array:

```tsx
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
    include: {
      _count: {
        select: {
          shopProducts: true,
          shopManagers: true,
          orders: true,
        },
      },
    },
  })
  if (!shop) notFound()

  const stats = [
    { label: "Products in Inventory", value: shop._count.shopProducts },
    { label: "Managers", value: shop._count.shopManagers },
    { label: "Total Orders", value: shop._count.orders },
  ]
```

**After:**

```tsx
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
    include: {
      _count: {
        select: {
          shopProducts: true,
          shopManagers: true,
        },
      },
    },
  })
  if (!shop) notFound()

  // "Today" = from local midnight to now
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [ordersToday, revenueToday] = await Promise.all([
    prisma.order.count({
      where: { shopId, createdAt: { gte: startOfToday } },
    }),
    prisma.order.aggregate({
      where: { shopId, status: "DELIVERED", updatedAt: { gte: startOfToday } },
      _sum: { totalAmount: true },
    }),
  ])

  const stats = [
    { label: "Products in Inventory", value: shop._count.shopProducts },
    { label: "Managers", value: shop._count.shopManagers },
    { label: "Orders Today", value: ordersToday },
    { label: "Revenue Today", value: `₹${(revenueToday._sum.totalAmount ?? 0).toLocaleString("en-IN")}` },
  ]
```

**Before** — the stats grid (now 4 cards, so widen it):

```tsx
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

**After:**

```tsx
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## Verify

After applying the fixes, restart the dev server and re-test the affected flows:

```bash
npm run dev
```

1. **Manager login** (Fix 1): owner adds a manager → copy temp password → sign in as the manager → forced to `/change-password` → set a new password → lands on `/manager`. (Before Fix 1 this failed at sign-in.)
2. **No oversell** (Fix 2): set a product's stock to 1, add it to two carts in two browsers, check out both — exactly one succeeds; the other sees "just sold out."
3. **Deactivation** (Fix 3): admin deactivates a customer → that customer can't reach `/customer` **or** `/profile`, and a fresh sign-in bounces to the "Account Deactivated" page.
4. **Remove guard** (Fix 4): try to remove a shop product that's in a PENDING order → blocked; cancel/deliver that order → removal now allowed.
5. **Seller conversion** (Fix 5): a customer with an order can no longer be flipped to seller.
6. **Dashboards** (Fix 6): shop cards show a "N pending" badge; the shop dashboard shows Orders Today and Revenue Today.

---

## Documented Trade-offs (no code change — just so you know)

These are intentional simplifications, not bugs:

- **One review per order.** The schema's `@@unique([customerId, orderId])` allows one `ProductReview` per order, keyed to the order's first product. Per-product ratings are exact for single-item orders.
- **CSV-only import.** `05-admin.md` parses CSV in the browser. Adding `.xlsx` is a one-package swap (`xlsx`).
- **Admin product delete** blocks on *any* past order item (not just active ones), because `OrderItem.productId` is a required foreign key — deleting an ever-ordered product would violate referential integrity.

---

## Out of Scope (PRD §13 — deliberately not built)

Online payment gateway · push/email notifications · promotions/discounts · multi-image products · live delivery tracking · restock alerts · mobile app · seller analytics · wishlists · in-app messaging · shop hours · map-based discovery. Reset-password links print to the terminal in development.

---

🎉 **With these fixes applied, the platform is feature-complete against the PRD and free of the correctness/security gaps found in review.** This is the end of the guide.
