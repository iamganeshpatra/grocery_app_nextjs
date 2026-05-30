# Developer Guide — 07: Customer Shopping

This document builds the entire customer-facing shopping experience:

- Customer layout + navbar with a live cart count
- Browse page (global catalog grid, search, category filter, "From ₹X" pricing)
- Product detail (shops offering it, per-shop stock/price, add to cart)
- Cart (quantity steppers, stock warnings, totals)
- Checkout (address selection, order summary, **one order per shop** placement)
- Order confirmation
- Saved address management

The single most important rule in this document is the **one-order-per-shop** architecture (PRD §4): when a customer's cart spans multiple shops, checkout creates a *separate* `Order` per shop. Each order is immutable — it stores snapshots of the product name, price, and delivery address.

---

## What You Are Building

```
/customer                       ← Browse (catalog grid)
/customer/product/[productId]   ← Product detail + shops + reviews
/customer/cart                  ← Cart
/customer/checkout              ← Address + summary + place order
/customer/checkout/confirmation ← Order IDs created
/customer/addresses             ← Saved addresses
```

(`/customer/orders…` — order tracking — is built in `09-customer-orders-returns.md`.)

---

## Step 1 — Cart Server Actions

Create `actions/cart.actions.ts`:

```typescript
// actions/cart.actions.ts
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

export async function addToCart(data: { productId: string; shopId: string; quantity: number }) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  if (data.quantity < 1) return { error: "Quantity must be at least 1" }

  // Validate the product is sold by this shop and has enough stock
  const shopProduct = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId: data.shopId, productId: data.productId } },
  })
  if (!shopProduct) return { error: "This shop no longer carries this product" }
  if (shopProduct.stock < data.quantity) {
    return { error: `Only ${shopProduct.stock} in stock` }
  }

  // If the same product+shop is already in the cart, add to the existing quantity
  const existing = await prisma.cart.findFirst({
    where: { userId: session!.user.id, productId: data.productId, shopId: data.shopId },
  })

  if (existing) {
    const newQty = existing.quantity + data.quantity
    if (shopProduct.stock < newQty) return { error: `Only ${shopProduct.stock} in stock` }
    await prisma.cart.update({ where: { id: existing.id }, data: { quantity: newQty } })
  } else {
    await prisma.cart.create({
      data: {
        userId: session!.user.id,
        productId: data.productId,
        shopId: data.shopId,
        quantity: data.quantity,
      },
    })
  }

  revalidatePath("/customer/cart")
  return { success: true }
}

export async function updateCartQuantity(cartId: string, quantity: number) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const item = await prisma.cart.findFirst({ where: { id: cartId, userId: session!.user.id } })
  if (!item) return { error: "Cart item not found" }

  if (quantity < 1) return { error: "Quantity must be at least 1" }

  const shopProduct = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId: item.shopId, productId: item.productId } },
  })
  if (!shopProduct || shopProduct.stock < quantity) {
    return { error: `Only ${shopProduct?.stock ?? 0} in stock` }
  }

  await prisma.cart.update({ where: { id: cartId }, data: { quantity } })
  revalidatePath("/customer/cart")
  return { success: true }
}

export async function removeFromCart(cartId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  await prisma.cart.deleteMany({ where: { id: cartId, userId: session!.user.id } })
  revalidatePath("/customer/cart")
  return { success: true }
}
```

---

## Step 2 — Address Server Actions

Create `actions/address.actions.ts`:

```typescript
// actions/address.actions.ts
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

type AddressInput = {
  fullName: string
  phone: string
  houseNo: string
  area: string
  landmark?: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

export async function createAddress(data: AddressInput) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id

  // If this is set as default, unset the previous default first
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
  }

  // If the user has no addresses yet, force this one to be default
  const count = await prisma.address.count({ where: { userId } })

  const address = await prisma.address.create({
    data: {
      userId,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      houseNo: data.houseNo.trim(),
      area: data.area.trim(),
      landmark: data.landmark?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      pincode: data.pincode.trim(),
      isDefault: data.isDefault || count === 0,
    },
  })

  revalidatePath("/customer/addresses")
  revalidatePath("/customer/checkout")
  return { data: address }
}

export async function updateAddress(addressId: string, data: AddressInput) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return { error: "Address not found" }

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
  }

  await prisma.address.update({
    where: { id: addressId },
    data: {
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      houseNo: data.houseNo.trim(),
      area: data.area.trim(),
      landmark: data.landmark?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      pincode: data.pincode.trim(),
      isDefault: data.isDefault,
    },
  })

  revalidatePath("/customer/addresses")
  return { success: true }
}

export async function setDefaultAddress(addressId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id
  await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
  await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } })

  revalidatePath("/customer/addresses")
  return { success: true }
}

export async function deleteAddress(addressId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return { error: "Address not found" }

  // PRD rule: an address linked to any Order cannot be deleted (order history integrity)
  const linked = await prisma.order.findFirst({ where: { addressId } })
  if (linked) {
    return { error: "This address is associated with orders and cannot be deleted." }
  }

  await prisma.address.delete({ where: { id: addressId } })
  revalidatePath("/customer/addresses")
  return { success: true }
}
```

---

## Step 3 — Place Order Server Action

This is the heart of checkout. It validates stock, groups the cart by shop, and creates **one order per shop**, writing immutable snapshots.

Create `actions/order.actions.ts`:

```typescript
// actions/order.actions.ts
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
```

> **No `$transaction`.** This project runs against Supabase's pooled connection (the same reason doc 04 avoids transactions). The steps run sequentially. For a learning project this is fine; in production you would wrap stock-decrement + order-create in a transaction against a direct connection.

---

## Step 4 — Customer Layout and Navbar

The navbar shows a live cart count, fetched server-side.

```tsx
// app/customer/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { CustomerNavbar } from "@/components/customer/navbar"

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "CUSTOMER") redirect("/unauthorized")

  const cartCount = await prisma.cart.count({ where: { userId: session.user.id } })

  return (
    <div className="min-h-screen flex flex-col">
      <CustomerNavbar userName={session.user.name} cartCount={cartCount} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

```tsx
// components/customer/navbar.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function CustomerNavbar({ userName, cartCount }: { userName: string; cartCount: number }) {
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
          <Link href="/customer" className="font-semibold text-lg">🛒 Grocery Market</Link>
          <Link href="/customer" className="text-sm text-muted-foreground hover:text-foreground">Browse</Link>
          <Link href="/customer/orders" className="text-sm text-muted-foreground hover:text-foreground">My Orders</Link>
          <Link href="/customer/addresses" className="text-sm text-muted-foreground hover:text-foreground">Addresses</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/customer/cart" className="relative text-sm hover:text-foreground flex items-center gap-1">
            Cart
            {cartCount > 0 && (
              <Badge className="bg-foreground text-background h-5 min-w-5 px-1 justify-center">{cartCount}</Badge>
            )}
          </Link>
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">{userName}</Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
    </header>
  )
}
```

```bash
mkdir -p components/customer
```

---

## Step 5 — Browse Page

The grid shows every catalog product with its lowest in-stock price across all shops ("From ₹X").

```tsx
// app/customer/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CategoryFilter } from "@/components/customer/category-filter"

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q = "", category = "" } = await searchParams

  const products = await prisma.product.findMany({
    where: {
      AND: [
        category ? { category } : {},
        q.trim()
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { name: "asc" },
  })

  // Lowest in-stock price per product, across all shops
  const inStock = await prisma.shopProduct.findMany({
    where: { stock: { gt: 0 }, productId: { in: products.map((p) => p.id) } },
    select: { productId: true, price: true },
  })
  const lowestPrice = new Map<string, number>()
  for (const sp of inStock) {
    const cur = lowestPrice.get(sp.productId)
    if (cur === undefined || sp.price < cur) lowestPrice.set(sp.productId, sp.price)
  }

  const categories = [...new Set((await prisma.product.findMany({ select: { category: true } })).map((p) => p.category))].sort()

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Browse Products</h1>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="w-full max-w-md border rounded-md px-3 py-2 text-sm bg-background"
        />
        {category && <input type="hidden" name="category" value={category} />}
      </form>

      <CategoryFilter categories={categories} current={category} query={q} />

      {products.length === 0 ? (
        <p className="text-muted-foreground mt-8">
          {q ? `No products found for "${q}". Try a different search.` : "No products available yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {products.map((p) => {
            const from = lowestPrice.get(p.id)
            return (
              <Link key={p.id} href={`/customer/product/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded bg-muted mb-2" />
                    ) : (
                      <div className="w-full h-32 rounded bg-muted mb-2" />
                    )}
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand ?? p.category} · {p.quantity}</p>
                    <div className="mt-2">
                      {from !== undefined ? (
                        <span className="text-sm font-semibold">From ₹{from}</span>
                      ) : (
                        <Badge variant="outline">Not available</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

```tsx
// components/customer/category-filter.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CategoryFilter({
  categories,
  current,
  query,
}: {
  categories: string[]
  current: string
  query: string
}) {
  const router = useRouter()

  function go(category: string) {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (category) params.set("category", category)
    router.push(`/customer?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant={current === "" ? "default" : "outline"} onClick={() => go("")}>All</Button>
      {categories.map((c) => (
        <Button key={c} size="sm" variant={current === c ? "default" : "outline"} onClick={() => go(c)}>
          {c}
        </Button>
      ))}
    </div>
  )
}
```

---

## Step 6 — Product Detail Page

Shows the product, every shop offering it (with stock, price, and that shop's average rating for this product), an add-to-cart control per shop, and a reviews list.

```tsx
// app/customer/product/[productId]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarDisplay } from "@/components/shared/star-rating"
import { AddToCartCard } from "@/components/customer/add-to-cart-card"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) notFound()

  const shopProducts = await prisma.shopProduct.findMany({
    where: { productId },
    include: { shop: { select: { id: true, name: true, category: true } } },
    orderBy: { price: "asc" },
  })

  // Average rating per shop for THIS product
  const ratings = await prisma.productReview.groupBy({
    by: ["shopId"],
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  })
  const ratingByShop = new Map(ratings.map((r) => [r.shopId, { avg: r._avg.rating ?? 0, count: r._count.rating }]))

  // All reviews for this product (across shops)
  const reviews = await prisma.productReview.findMany({
    where: { productId },
    include: { customer: { select: { name: true } }, shop: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/customer" className="text-sm text-muted-foreground hover:text-foreground">← Back to Browse</Link>

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full md:w-64 h-64 object-cover rounded bg-muted" />
        ) : (
          <div className="w-full md:w-64 h-64 rounded bg-muted" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">{product.brand ?? product.category} · {product.quantity}</p>
          <Badge variant="secondary" className="mt-2">{product.category}</Badge>
          {product.description && <p className="text-sm mt-3">{product.description}</p>}
        </div>
      </div>

      {/* Shops offering this product */}
      <h2 className="text-lg font-semibold mt-8 mb-3">Available at</h2>
      {shopProducts.length === 0 ? (
        <p className="text-muted-foreground">No shops are currently offering this product.</p>
      ) : (
        <div className="space-y-3">
          {shopProducts.map((sp) => {
            const rating = ratingByShop.get(sp.shop.id)
            return (
              <AddToCartCard
                key={sp.id}
                productId={product.id}
                shopId={sp.shop.id}
                shopName={sp.shop.name}
                shopCategory={sp.shop.category}
                price={sp.price}
                stock={sp.stock}
                avgRating={rating?.avg ?? 0}
                ratingCount={rating?.count ?? 0}
              />
            )
          })}
        </div>
      )}

      {/* Reviews */}
      <h2 className="text-lg font-semibold mt-8 mb-3">Customer Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.customer.name}</span>
                  <StarDisplay rating={r.rating} />
                </div>
                <p className="text-xs text-muted-foreground">{r.shop.name}</p>
                {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

Now the shared star-rating components (used here and in the feedback flow later):

```tsx
// components/shared/star-rating.tsx
"use client"

export function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"}>★</span>
      ))}
    </div>
  )
}

export function StarPicker({
  value,
  onChange,
  max = 5,
}: {
  value: number
  onChange: (rating: number) => void
  max?: number
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${star <= value ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
```

```bash
mkdir -p components/shared
```

And the add-to-cart card:

```tsx
// components/customer/add-to-cart-card.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addToCart } from "@/actions/cart.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarDisplay } from "@/components/shared/star-rating"

export function AddToCartCard({
  productId,
  shopId,
  shopName,
  shopCategory,
  price,
  stock,
  avgRating,
  ratingCount,
}: {
  productId: string
  shopId: string
  shopName: string
  shopCategory: string
  price: number
  stock: number
  avgRating: number
  ratingCount: number
}) {
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    startTransition(async () => {
      const result = await addToCart({ productId, shopId, quantity: qty })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Added to cart from ${shopName}`)
      router.refresh() // updates the navbar cart count
    })
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium">{shopName}</p>
          <p className="text-xs text-muted-foreground">{shopCategory}</p>
          {ratingCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <StarDisplay rating={avgRating} />
              <span className="text-xs text-muted-foreground">({ratingCount})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold">₹{price}</span>
          {stock === 0 ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : (
            <>
              <select
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10))}
                className="border rounded-md px-2 py-1 text-sm bg-background"
              >
                {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Adding…" : "Add to Cart"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Step 7 — Cart Page

```tsx
// app/customer/cart/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { CartView } from "./_components/cart-view"

export default async function CartPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const items = await prisma.cart.findMany({
    where: { userId: session.user.id },
    include: { product: true, shop: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Attach the live shop price + stock for each item
  const enriched = await Promise.all(
    items.map(async (item) => {
      const sp = await prisma.shopProduct.findUnique({
        where: { shopId_productId: { shopId: item.shopId, productId: item.productId } },
      })
      return {
        id: item.id,
        productName: item.product.name,
        shopName: item.shop.name,
        quantity: item.quantity,
        price: sp?.price ?? 0,
        stock: sp?.stock ?? 0,
      }
    })
  )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      <CartView initialItems={enriched} />
    </div>
  )
}
```

```tsx
// app/customer/cart/_components/cart-view.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { updateCartQuantity, removeFromCart } from "@/actions/cart.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type CartItem = {
  id: string
  productName: string
  shopName: string
  quantity: number
  price: number
  stock: number
}

export function CartView({ initialItems }: { initialItems: CartItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()

  function changeQty(id: string, nextQty: number) {
    if (nextQty < 1) return
    startTransition(async () => {
      const result = await updateCartQuantity(id, nextQty)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: nextQty } : i)))
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeFromCart(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success("Removed from cart")
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground mb-4">Your cart is empty.</p>
        <Button asChild><Link href="/customer">Browse Products</Link></Button>
      </div>
    )
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const overStock = item.quantity > item.stock
        return (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">{item.shopName} · ₹{item.price} each</p>
                {overStock && (
                  <p className="text-xs text-red-600 mt-1">
                    Only {item.stock} left — reduce the quantity to continue.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" disabled={isPending || item.quantity <= 1}
                    onClick={() => changeQty(item.id, item.quantity - 1)}>−</Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button size="sm" variant="outline" disabled={isPending || item.quantity >= item.stock}
                    onClick={() => changeQty(item.id, item.quantity + 1)}>+</Button>
                </div>
                <span className="font-semibold w-16 text-right">₹{item.price * item.quantity}</span>
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => remove(item.id)}>Remove</Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-lg font-semibold">Total: ₹{total}</span>
        <Button
          asChild
          disabled={items.some((i) => i.quantity > i.stock)}
        >
          <Link href="/customer/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 8 — Checkout Page

Shows the address picker (with an inline "add new" form), an order summary grouped by shop, and the Place Order button.

```tsx
// app/customer/checkout/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { CheckoutView } from "./_components/checkout-view"

export default async function CheckoutPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")
  const userId = session.user.id

  const [addresses, cartItems] = await Promise.all([
    prisma.address.findMany({ where: { userId }, orderBy: { isDefault: "desc" } }),
    prisma.cart.findMany({ where: { userId }, include: { product: true, shop: { select: { name: true } } } }),
  ])

  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-muted-foreground mb-4">Your cart is empty.</p>
        <Link href="/customer" className="underline">Browse products</Link>
      </div>
    )
  }

  // Price each line + group by shop for the summary
  const lines = await Promise.all(
    cartItems.map(async (item) => {
      const sp = await prisma.shopProduct.findUnique({
        where: { shopId_productId: { shopId: item.shopId, productId: item.productId } },
      })
      return {
        shopName: item.shop.name,
        productName: item.product.name,
        quantity: item.quantity,
        price: sp?.price ?? 0,
      }
    })
  )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <CheckoutView
        addresses={addresses}
        lines={lines}
      />
    </div>
  )
}
```

```tsx
// app/customer/checkout/_components/checkout-view.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { placeOrder } from "@/actions/order.actions"
import { createAddress } from "@/actions/address.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Address = {
  id: string
  fullName: string
  phone: string
  houseNo: string
  area: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

type Line = { shopName: string; productName: string; quantity: number; price: number }

export function CheckoutView({ addresses, lines }: { addresses: Address[]; lines: Line[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "")
  const [showForm, setShowForm] = useState(addresses.length === 0)
  const [isPending, startTransition] = useTransition()

  // New-address form state
  const [form, setForm] = useState({
    fullName: "", phone: "", houseNo: "", area: "", landmark: "",
    city: "", state: "", pincode: "",
  })

  function field(name: keyof typeof form) {
    return { value: form[name], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: e.target.value }) }
  }

  function saveAddress() {
    if (!form.fullName || !form.phone || !form.houseNo || !form.city || !form.state || !form.pincode) {
      toast.error("Fill in all required address fields")
      return
    }
    startTransition(async () => {
      const result = await createAddress({ ...form, isDefault: addresses.length === 0 })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Address saved")
      setShowForm(false)
      router.refresh()
    })
  }

  function handlePlaceOrder() {
    if (!selectedId) {
      toast.error("Select a delivery address")
      return
    }
    startTransition(async () => {
      const result = await placeOrder(selectedId)
      if (result.error) {
        toast.error(result.error)
        if ("invalid" in result && result.invalid) router.push("/customer/cart")
        return
      }
      const ids = result.data!.orders.map((o) => o.id).join(",")
      router.push(`/customer/checkout/confirmation?ids=${ids}`)
    })
  }

  // Group lines by shop for the summary
  const byShop = new Map<string, Line[]>()
  for (const l of lines) {
    const list = byShop.get(l.shopName) ?? []
    list.push(l)
    byShop.set(l.shopName, list)
  }
  const grandTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Address selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery Address</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {addresses.map((a) => (
            <label key={a.id} className="flex items-start gap-3 border rounded-md p-3 cursor-pointer">
              <input
                type="radio"
                name="address"
                checked={selectedId === a.id}
                onChange={() => setSelectedId(a.id)}
                className="mt-1"
              />
              <div className="text-sm">
                <p className="font-medium">{a.fullName} · {a.phone}</p>
                <p className="text-muted-foreground">
                  {a.houseNo}, {a.area}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} - {a.pincode}
                </p>
                {a.isDefault && <span className="text-xs text-green-600">Default</span>}
              </div>
            </label>
          ))}

          {!showForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>+ Add New Address</Button>
          ) : (
            <div className="border rounded-md p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Full name *" {...field("fullName")} />
                <Input placeholder="Phone *" {...field("phone")} />
                <Input placeholder="House / Flat no. *" {...field("houseNo")} />
                <Input placeholder="Area / Street *" {...field("area")} />
                <Input placeholder="Landmark" {...field("landmark")} />
                <Input placeholder="City *" {...field("city")} />
                <Input placeholder="State *" {...field("state")} />
                <Input placeholder="Pincode *" {...field("pincode")} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveAddress} disabled={isPending}>Save Address</Button>
                {addresses.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[...byShop.entries()].map(([shopName, shopLines]) => {
            const shopTotal = shopLines.reduce((sum, l) => sum + l.price * l.quantity, 0)
            return (
              <div key={shopName}>
                <p className="text-sm font-medium">{shopName}</p>
                {shopLines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm text-muted-foreground">
                    <span>{l.productName} × {l.quantity}</span>
                    <span>₹{l.price * l.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t mt-1 pt-1">
                  <span>Shop subtotal</span><span>₹{shopTotal}</span>
                </div>
              </div>
            )
          })}
          <div className="flex justify-between font-semibold border-t pt-3">
            <span>Grand Total</span><span>₹{grandTotal}</span>
          </div>
          <p className="text-xs text-muted-foreground">Payment method: Cash on Delivery</p>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handlePlaceOrder} disabled={isPending || !selectedId}>
        {isPending ? "Placing order…" : "Place Order"}
      </Button>
    </div>
  )
}
```

> **Why one order per shop matters here.** The summary is grouped by shop on purpose — each group becomes its own `Order`. After placing, the customer sees one confirmation listing every order ID created.

---

## Step 9 — Confirmation Page

```tsx
// app/customer/checkout/confirmation/page.tsx
import Link from "next/link"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids = "" } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const orderIds = ids.split(",").filter(Boolean)
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, userId: session.user.id },
    include: { shop: { select: { name: true } } },
  })

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-2">Order(s) placed successfully!</h1>
      <p className="text-muted-foreground mb-6">
        {orders.length === 1 ? "Your order has been placed." : `${orders.length} orders were created — one per shop.`}
      </p>

      <div className="space-y-2 text-left">
        {orders.map((o) => (
          <Link key={o.id} href={`/customer/orders/${o.id}`}>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{o.shop.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">#{o.id.slice(-6)}</p>
                </div>
                <span className="font-semibold">₹{o.totalAmount}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button asChild className="mt-6"><Link href="/customer">Continue Shopping</Link></Button>
    </div>
  )
}
```

---

## Step 10 — Addresses Page

```tsx
// app/customer/addresses/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { AddressManager } from "./_components/address-manager"

export default async function AddressesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  })

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Saved Addresses</h1>
      <AddressManager initialAddresses={addresses} />
    </div>
  )
}
```

```tsx
// app/customer/addresses/_components/address-manager.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/actions/address.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Address = {
  id: string
  fullName: string
  phone: string
  houseNo: string
  area: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

const EMPTY = { fullName: "", phone: "", houseNo: "", area: "", landmark: "", city: "", state: "", pincode: "", isDefault: false }

export function AddressManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Address | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [isPending, startTransition] = useTransition()

  function field(name: keyof typeof form) {
    return { value: String(form[name] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: e.target.value }) }
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }
  function openEdit(a: Address) {
    setEditing(a)
    setForm({ ...a, landmark: a.landmark ?? "" })
    setShowForm(true)
  }

  function save() {
    if (!form.fullName || !form.phone || !form.houseNo || !form.city || !form.state || !form.pincode) {
      toast.error("Fill in all required fields")
      return
    }
    startTransition(async () => {
      const payload = { ...form, isDefault: !!form.isDefault }
      const result = editing ? await updateAddress(editing.id, payload) : await createAddress(payload)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? "Address updated" : "Address added")
      setShowForm(false)
      router.refresh()
    })
  }

  function remove(a: Address) {
    if (!confirm("Delete this address?")) return
    startTransition(async () => {
      const result = await deleteAddress(a.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Address deleted")
      router.refresh()
    })
  }

  function makeDefault(a: Address) {
    startTransition(async () => {
      const result = await setDefaultAddress(a.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Default address updated")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {!showForm && <Button onClick={openCreate}>+ Add Address</Button>}

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-medium">{editing ? "Edit Address" : "New Address"}</h2>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Full name *" {...field("fullName")} />
              <Input placeholder="Phone *" {...field("phone")} />
              <Input placeholder="House / Flat no. *" {...field("houseNo")} />
              <Input placeholder="Area / Street *" {...field("area")} />
              <Input placeholder="Landmark" {...field("landmark")} />
              <Input placeholder="City *" {...field("city")} />
              <Input placeholder="State *" {...field("state")} />
              <Input placeholder="Pincode *" {...field("pincode")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Set as default address
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={isPending}>{editing ? "Save Changes" : "Save Address"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {initialAddresses.length === 0 && !showForm ? (
        <p className="text-muted-foreground">You have no saved addresses yet.</p>
      ) : (
        <div className="space-y-2">
          {initialAddresses.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex justify-between items-start gap-4">
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.fullName} · {a.phone}</p>
                    {a.isDefault && <Badge className="bg-green-600 text-white">Default</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {a.houseNo}, {a.area}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} - {a.pincode}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!a.isDefault && (
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => makeDefault(a)}>Set Default</Button>
                  )}
                  <Button size="sm" variant="outline" disabled={isPending} onClick={() => openEdit(a)}>Edit</Button>
                  <Button size="sm" variant="outline" disabled={isPending} onClick={() => remove(a)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Step 11 — Verify the Customer Flow

```bash
npm run dev
```

1. **Sign up as a customer** at `/signup/customer` → land on `/customer`.
2. **Set up shops first** (in another browser as a shop owner): create a shop, add a few catalog products with stock and price. Without this, browse shows "Not available".
3. **Browse** → search, filter by category, see "From ₹X" pricing.
4. **Open a product** → see the shop(s) offering it → choose a quantity → Add to Cart → navbar count goes up.
5. **Add items from two different shops.**
6. **Cart** → adjust quantities, see live totals, the stock warning if you exceed stock.
7. **Checkout** → add an address (first one auto-becomes default), review the summary grouped by shop → Place Order.
8. **Confirmation** → you see **two order IDs** (one per shop). Click one.
9. **Addresses** → add, edit, set default, delete. Try deleting the address you just ordered with → blocked.
10. **Verify stock dropped**: as the shop owner, open the products page — the stock for the ordered items is reduced.

---

## File Reference — Files Created in This Document

```
actions/
  cart.actions.ts
  address.actions.ts
  order.actions.ts                 (placeOrder — extended in doc 08 & 09)
components/customer/
  navbar.tsx
  category-filter.tsx
  add-to-cart-card.tsx
components/shared/
  star-rating.tsx
app/customer/
  layout.tsx
  page.tsx
  product/[productId]/page.tsx
  cart/page.tsx
  cart/_components/cart-view.tsx
  checkout/page.tsx
  checkout/_components/checkout-view.tsx
  checkout/confirmation/page.tsx
  addresses/page.tsx
  addresses/_components/address-manager.tsx
```

Now proceed to `08-fulfillment.md`.
