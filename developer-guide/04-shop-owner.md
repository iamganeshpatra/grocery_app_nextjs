# Developer Guide — 04: Shop Owner

This document covers everything a shop owner can do:
- View and manage their shops (dashboard)
- Create a new shop
- Edit shop details
- Manage shop products (add from catalog, update stock/price, remove)
- Manage shop managers (add by email, remove)

Work through each section in order. Do not skip ahead.

---

## What You Are Building

```
/shop-owner                         ← Dashboard: all shops
/shop-owner/new                     ← Create shop form
/shop-owner/[shopId]                ← Shop stats dashboard
/shop-owner/[shopId]/edit           ← Edit shop details
/shop-owner/[shopId]/products       ← Manage products (split-panel)
/shop-owner/[shopId]/managers       ← Manage managers
```

---

## Step 1 — Create Shop Server Actions

Create `actions/shop.actions.ts`:

```typescript
// actions/shop.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireShopOwner() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "SHOP_OWNER") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

async function verifyShopOwnership(shopId: string, ownerId: string) {
  const shop = await prisma.shop.findFirst({ where: { id: shopId, ownerId } })
  return shop
}

// ── Shop CRUD ─────────────────────────────────────────────────────────────────

export async function createShop(data: {
  name: string
  category: string
  description?: string
  contactPhone?: string
}) {
  const { error, session } = await requireShopOwner()
  if (error) return { error }

  const shop = await prisma.shop.create({
    data: {
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      ownerId: session!.user.id,
    },
  })

  revalidatePath("/shop-owner")
  return { data: shop }
}

export async function updateShop(
  shopId: string,
  data: {
    name: string
    category: string
    description?: string
    contactPhone?: string
  }
) {
  const { error, session } = await requireShopOwner()
  if (error) return { error }

  const shop = await verifyShopOwnership(shopId, session!.user.id)
  if (!shop) return { error: "Shop not found" }

  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
    },
  })

  revalidatePath(`/shop-owner/${shopId}`)
  revalidatePath(`/shop-owner/${shopId}/edit`)
  return { data: updated }
}
```

---

## Step 2 — Create Shop Product Server Actions

Create `actions/shop-product.actions.ts`:

```typescript
// actions/shop-product.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function requireShopAccess(shopId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }

  const role = session.user.role as string

  if (role === "SHOP_OWNER") {
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, ownerId: session.user.id },
    })
    if (!shop) return { error: "Shop not found" as const, session: null }
  } else if (role === "SHOP_MANAGER") {
    const assignment = await prisma.shopManager.findFirst({
      where: { shopId, userId: session.user.id },
    })
    if (!assignment) return { error: "Not assigned to this shop" as const, session: null }
  } else {
    return { error: "Forbidden" as const, session: null }
  }

  return { error: null, session }
}

export async function addProductToShop(
  shopId: string,
  data: { productId: string; stock: number; price: number }
) {
  const { error } = await requireShopAccess(shopId)
  if (error) return { error }

  if (data.stock < 0) return { error: "Stock cannot be negative" }
  if (data.price <= 0) return { error: "Price must be greater than 0" }

  // Check if already added
  const existing = await prisma.shopProduct.findUnique({
    where: { shopId_productId: { shopId, productId: data.productId } },
  })
  if (existing) return { error: "This product is already in your shop" }

  const shopProduct = await prisma.shopProduct.create({
    data: {
      shopId,
      productId: data.productId,
      stock: data.stock,
      price: data.price,
    },
  })

  revalidatePath(`/shop-owner/${shopId}/products`)
  revalidatePath(`/manager/${shopId}/products`)
  return { data: shopProduct }
}

export async function updateShopProduct(
  shopId: string,
  shopProductId: string,
  data: { stock: number; price: number }
) {
  const { error } = await requireShopAccess(shopId)
  if (error) return { error }

  if (data.stock < 0) return { error: "Stock cannot be negative" }
  if (data.price <= 0) return { error: "Price must be greater than 0" }

  const updated = await prisma.shopProduct.update({
    where: { id: shopProductId },
    data: { stock: data.stock, price: data.price },
  })

  revalidatePath(`/shop-owner/${shopId}/products`)
  revalidatePath(`/manager/${shopId}/products`)
  return { data: updated }
}

export async function removeProductFromShop(shopId: string, shopProductId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  // Only shop owners can remove products
  if (session.user.role !== "SHOP_OWNER") {
    return { error: "Only shop owners can remove products" }
  }

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

// Search global catalog — returns products NOT yet in this shop
export async function searchCatalog(shopId: string, query: string) {
  const { error } = await requireShopAccess(shopId)
  if (error) return { error, data: [] }

  if (!query.trim()) return { error: null, data: [] }

  // Get IDs of products already in this shop
  const existing = await prisma.shopProduct.findMany({
    where: { shopId },
    select: { productId: true },
  })
  const existingIds = existing.map((e) => e.productId)

  const products = await prisma.product.findMany({
    where: {
      AND: [
        { id: { notIn: existingIds } },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  })

  return { error: null, data: products }
}
```

---

## Step 3 — Create Manager Server Actions

Create `actions/manager.actions.ts`:

```typescript
// actions/manager.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function requireShopOwner(shopId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "SHOP_OWNER") return { error: "Forbidden" as const, session: null }

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) return { error: "Shop not found" as const, session: null, shop: null }

  return { error: null, session, shop }
}

export async function addManager(shopId: string, email: string) {
  const { error, shop } = await requireShopOwner(shopId)
  if (error) return { error }

  const trimmedEmail = email.trim().toLowerCase()

  // Look up existing user with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  })

  if (existingUser) {
    // Email belongs to a non-manager role
    if (existingUser.role !== "SHOP_MANAGER") {
      return {
        error: `This email is registered as ${existingUser.role}. Only SHOP_MANAGER accounts can be added.`,
      }
    }

    // Already assigned to this shop
    const alreadyAssigned = await prisma.shopManager.findUnique({
      where: { shopId_userId: { shopId, userId: existingUser.id } },
    })
    if (alreadyAssigned) {
      return { error: "This person is already a manager of this shop." }
    }

    // Link existing manager to shop
    await prisma.shopManager.create({
      data: { shopId, userId: existingUser.id },
    })

    revalidatePath(`/shop-owner/${shopId}/managers`)
    return { success: true, tempPassword: null, message: "Manager added successfully." }
  }

  // No existing user — create a new SHOP_MANAGER account
  const shopName = shop!.name
  const tempPassword = `Welcome@${shopName.replace(/\s+/g, "")}1`
  const hashedPassword = await bcrypt.hash(tempPassword, 10)

  // Create user + account in two steps (no transaction — Supabase pool doesn't support it)
  const newUser = await prisma.user.create({
    data: {
      name: trimmedEmail.split("@")[0], // Placeholder name from email prefix
      email: trimmedEmail,
      role: "SHOP_MANAGER",
      emailVerified: false,
      mustChangePassword: true,
    },
  })

  await prisma.account.create({
    data: {
      accountId: newUser.id,
      providerId: "credential",
      userId: newUser.id,
      password: hashedPassword,
    },
  })

  // Link to shop
  await prisma.shopManager.create({
    data: { shopId, userId: newUser.id },
  })

  revalidatePath(`/shop-owner/${shopId}/managers`)

  return {
    success: true,
    tempPassword,
    message: `New manager account created. Share this temporary password with them — it will only be shown once.`,
  }
}

export async function removeManager(shopId: string, managerId: string) {
  const { error } = await requireShopOwner(shopId)
  if (error) return { error }

  // managerId here is the ShopManager.id (junction record), not the User.id
  await prisma.shopManager.delete({ where: { id: managerId } })

  revalidatePath(`/shop-owner/${shopId}/managers`)
  return { success: true }
}
```

---

## Step 4 — Create the Shop Owner Layout

```tsx
// app/shop-owner/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ShopOwnerNavbar } from "@/components/shop-owner/navbar"

export default async function ShopOwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "SHOP_OWNER") {
    redirect("/unauthorized")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ShopOwnerNavbar userName={session.user.name} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

Now create the navbar component:

```tsx
// components/shop-owner/navbar.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function ShopOwnerNavbar({ userName }: { userName: string }) {
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
          <Link href="/shop-owner" className="font-semibold text-lg">
            🛒 Grocery Market
          </Link>
          <Link
            href="/shop-owner"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            My Shops
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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

Make sure `components/shop-owner/` folder exists. Create it:

```bash
mkdir -p components/shop-owner
```

---

## Step 5 — Create app/shop-owner/page.tsx (Dashboard)

```tsx
// app/shop-owner/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ShopOwnerDashboard() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Shops</h1>
          <p className="text-muted-foreground text-sm">
            {shops.length} {shops.length === 1 ? "shop" : "shops"}
          </p>
        </div>
        <Button asChild>
          <Link href="/shop-owner/new">+ Create Shop</Link>
        </Button>
      </div>

      {shops.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground text-lg">
            You haven&apos;t created any shops yet.
          </p>
          <Button asChild className="mt-4">
            <Link href="/shop-owner/new">Create Your First Shop</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Link key={shop.id} href={`/shop-owner/${shop.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {shop.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {shop.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {shop.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{shop._count.shopProducts} products</span>
                    <span>{shop._count.shopManagers} managers</span>
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

## Step 6 — Create app/shop-owner/new/page.tsx (Create Shop)

```tsx
// app/shop-owner/new/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { createShop } from "@/actions/shop.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SHOP_CATEGORIES = [
  "Grocery",
  "Vegetables & Fruits",
  "Dairy & Eggs",
  "Meat & Fish",
  "Bakery",
  "Beverages",
  "Organic",
  "Snacks",
  "Other",
]

export default function CreateShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Shop name is required")
      return
    }
    if (!category) {
      toast.error("Please select a category")
      return
    }

    setLoading(true)

    const result = await createShop({ name, category, description, contactPhone })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Shop created!")
    router.push(`/shop-owner/${result.data!.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/shop-owner"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to My Shops
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Shop</CardTitle>
          <CardDescription>
            Fill in your shop details. You can edit these later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Shop Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Singh Fresh Market"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select a category</option>
                {SHOP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of your shop (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Phone</label>
              <Input
                type="tel"
                placeholder="e.g. +91 98765 43210 (optional)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Shop"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/shop-owner">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Step 7 — Create Per-Shop Layout and Subnav

```tsx
// app/shop-owner/[shopId]/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ShopSubNav } from "@/components/shop-owner/shop-subnav"

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "SHOP_OWNER") redirect("/unauthorized")

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) notFound()

  return (
    <div>
      <ShopSubNav shopId={shopId} shopName={shop.name} />
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  )
}
```

Create the shop sub-navigation component:

```tsx
// components/shop-owner/shop-subnav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Dashboard", href: "" },
  { label: "Products", href: "/products" },
  { label: "Managers", href: "/managers" },
]

export function ShopSubNav({
  shopId,
  shopName,
}: {
  shopId: string
  shopName: string
}) {
  const pathname = usePathname()
  const base = `/shop-owner/${shopId}`

  return (
    <div className="border-b bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 pt-3">
          <Link
            href="/shop-owner"
            className="text-sm text-muted-foreground hover:text-foreground mr-3"
          >
            ← All Shops
          </Link>
          <span className="text-sm font-semibold mr-4">{shopName}</span>

          {tabs.map((tab) => {
            const href = `${base}${tab.href}`
            const isActive =
              tab.href === ""
                ? pathname === base
                : pathname.startsWith(href)

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

          <Link
            href={`${base}/edit`}
            className={cn(
              "px-3 py-2 text-sm border-b-2 transition-colors ml-auto",
              pathname === `${base}/edit`
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Edit Shop
          </Link>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 8 — Create app/shop-owner/[shopId]/page.tsx (Shop Dashboard)

```tsx
// app/shop-owner/[shopId]/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ShopDashboardPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <p className="text-muted-foreground text-sm">{shop.category}</p>
        {shop.description && (
          <p className="text-sm mt-1">{shop.description}</p>
        )}
        {shop.contactPhone && (
          <p className="text-sm text-muted-foreground">{shop.contactPhone}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 9 — Create app/shop-owner/[shopId]/edit/page.tsx

```tsx
// app/shop-owner/[shopId]/edit/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { EditShopForm } from "./_components/edit-shop-form"

export default async function EditShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Shop</h1>
      <EditShopForm shop={shop} />
    </div>
  )
}
```

Create the edit form client component:

```tsx
// app/shop-owner/[shopId]/edit/_components/edit-shop-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateShop } from "@/actions/shop.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

const SHOP_CATEGORIES = [
  "Grocery",
  "Vegetables & Fruits",
  "Dairy & Eggs",
  "Meat & Fish",
  "Bakery",
  "Beverages",
  "Organic",
  "Snacks",
  "Other",
]

type Shop = {
  id: string
  name: string
  category: string
  description: string | null
  contactPhone: string | null
}

export function EditShopForm({ shop }: { shop: Shop }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(shop.name)
  const [category, setCategory] = useState(shop.category)
  const [description, setDescription] = useState(shop.description ?? "")
  const [contactPhone, setContactPhone] = useState(shop.contactPhone ?? "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) { toast.error("Shop name is required"); return }
    if (!category) { toast.error("Please select a category"); return }

    setLoading(true)

    const result = await updateShop(shop.id, { name, category, description, contactPhone })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Shop updated!")
    router.push(`/shop-owner/${shop.id}`)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Shop Name <span className="text-red-500">*</span></label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              {SHOP_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Contact Phone</label>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

---

## Step 10 — Create app/shop-owner/[shopId]/products/page.tsx

This is the most complex page — a split panel with catalog search on the left and inventory on the right.

```tsx
// app/shop-owner/[shopId]/products/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ShopProductsManager } from "./_components/shop-products-manager"

export default async function ShopProductsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) notFound()

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
        isOwner={true}
      />
    </div>
  )
}
```

Now create the interactive client component:

```tsx
// app/shop-owner/[shopId]/products/_components/shop-products-manager.tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  searchCatalog,
  addProductToShop,
  updateShopProduct,
  removeProductFromShop,
} from "@/actions/shop-product.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = {
  id: string
  name: string
  category: string
  brand: string | null
  price: number
  quantity: string
  imageUrl: string | null
}

type ShopProductWithProduct = {
  id: string
  stock: number
  price: number
  product: Product
}

// ── Stock badge colour ────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <Badge variant="destructive">Out of Stock</Badge>
  if (stock <= 4)
    return <Badge className="bg-orange-500 text-white">Low: {stock}</Badge>
  return <Badge className="bg-green-600 text-white">{stock} in stock</Badge>
}

// ── Add Product Dialog ────────────────────────────────────────────────────────

function AddProductDialog({
  shopId,
  product,
  onAdded,
  onClose,
}: {
  shopId: string
  product: Product
  onAdded: (newItem: ShopProductWithProduct) => void
  onClose: () => void
}) {
  const [stock, setStock] = useState("")
  const [price, setPrice] = useState(String(product.price))
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    const stockNum = parseInt(stock, 10)
    const priceNum = parseFloat(price)

    if (isNaN(stockNum) || stockNum < 0) { toast.error("Enter a valid stock quantity"); return }
    if (isNaN(priceNum) || priceNum <= 0) { toast.error("Enter a valid price"); return }

    startTransition(async () => {
      const result = await addProductToShop(shopId, {
        productId: product.id,
        stock: stockNum,
        price: priceNum,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`${product.name} added to shop`)
      onAdded({ id: result.data!.id, stock: stockNum, price: priceNum, product })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add to Shop</h2>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{product.name}</p>
          <p>{product.category} · {product.quantity}</p>
          <p>Reference price: ₹{product.price}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Stock Quantity <span className="text-red-500">*</span></label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your Selling Price (₹) <span className="text-red-500">*</span></label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is the price customers will pay at your shop.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleAdd} disabled={isPending} className="flex-1">
            {isPending ? "Adding..." : "Add to Shop"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Product Dialog ───────────────────────────────────────────────────────

function EditProductDialog({
  shopId,
  item,
  onUpdated,
  onClose,
}: {
  shopId: string
  item: ShopProductWithProduct
  onUpdated: (updated: ShopProductWithProduct) => void
  onClose: () => void
}) {
  const [stock, setStock] = useState(String(item.stock))
  const [price, setPrice] = useState(String(item.price))
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const stockNum = parseInt(stock, 10)
    const priceNum = parseFloat(price)

    if (isNaN(stockNum) || stockNum < 0) { toast.error("Enter a valid stock quantity"); return }
    if (isNaN(priceNum) || priceNum <= 0) { toast.error("Enter a valid price"); return }

    startTransition(async () => {
      const result = await updateShopProduct(shopId, item.id, {
        stock: stockNum,
        price: priceNum,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Updated")
      onUpdated({ ...item, stock: stockNum, price: priceNum })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Edit: {item.product.name}</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Stock Quantity</label>
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Selling Price (₹)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ShopProductsManager({
  shopId,
  initialInventory,
  isOwner,
}: {
  shopId: string
  initialInventory: ShopProductWithProduct[]
  isOwner: boolean
}) {
  const [inventory, setInventory] = useState(initialInventory)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [addTarget, setAddTarget] = useState<Product | null>(null)
  const [editTarget, setEditTarget] = useState<ShopProductWithProduct | null>(null)

  const [isPendingRemove, startRemoveTransition] = useTransition()

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const result = await searchCatalog(shopId, query)
    setIsSearching(false)

    if (result.error) {
      toast.error(result.error)
      return
    }
    setSearchResults(result.data)
  }

  function handleProductAdded(newItem: ShopProductWithProduct) {
    setInventory((prev) => [newItem, ...prev])
    // Remove from search results
    setSearchResults((prev) => prev.filter((p) => p.id !== newItem.product.id))
  }

  function handleProductUpdated(updated: ShopProductWithProduct) {
    setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  function handleRemove(shopProductId: string, productName: string) {
    if (!confirm(`Remove "${productName}" from your shop?`)) return

    startRemoveTransition(async () => {
      const result = await removeProductFromShop(shopId, shopProductId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setInventory((prev) => prev.filter((item) => item.id !== shopProductId))
      toast.success(`"${productName}" removed`)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ─── LEFT: Catalog Search ─────────────────────────────────── */}
      <div>
        <h2 className="font-semibold mb-3">Search Product Catalog</h2>
        <Input
          placeholder="Search by name, category, or brand..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-3"
        />

        {isSearching && (
          <p className="text-sm text-muted-foreground">Searching...</p>
        )}

        {!isSearching && searchQuery && searchResults.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No products found for &quot;{searchQuery}&quot;.
          </p>
        )}

        {!searchQuery && (
          <p className="text-sm text-muted-foreground">
            Type to search the product catalog. Products already in your shop are hidden.
          </p>
        )}

        <div className="space-y-2 mt-2">
          {searchResults.map((product) => (
            <Card key={product.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                    {product.brand ? ` · ${product.brand}` : ""} · {product.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ref. price: ₹{product.price}
                  </p>
                </div>
                <Button size="sm" onClick={() => setAddTarget(product)}>
                  + Add
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── RIGHT: Inventory ─────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold mb-3">
          Your Inventory ({inventory.length})
        </h2>

        {inventory.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>No products in your shop yet.</p>
            <p className="text-sm mt-1">Search the catalog on the left to add some.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inventory.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.category} · {item.product.quantity}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StockBadge stock={item.stock} />
                      <span className="text-sm font-medium">₹{item.price}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditTarget(item)}
                    >
                      Edit
                    </Button>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPendingRemove}
                        onClick={() => handleRemove(item.id, item.product.name)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────── */}
      {addTarget && (
        <AddProductDialog
          shopId={shopId}
          product={addTarget}
          onAdded={handleProductAdded}
          onClose={() => setAddTarget(null)}
        />
      )}

      {editTarget && (
        <EditProductDialog
          shopId={shopId}
          item={editTarget}
          onUpdated={handleProductUpdated}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
```

---

## Step 11 — Create app/shop-owner/[shopId]/managers/page.tsx

```tsx
// app/shop-owner/[shopId]/managers/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ManagersPanel } from "./_components/managers-panel"

export default async function ShopManagersPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signin")

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  })
  if (!shop) notFound()

  const managers = await prisma.shopManager.findMany({
    where: { shopId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Managers</h1>
      <ManagersPanel shopId={shopId} initialManagers={managers} />
    </div>
  )
}
```

Create the managers panel client component:

```tsx
// app/shop-owner/[shopId]/managers/_components/managers-panel.tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addManager, removeManager } from "@/actions/manager.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Manager = {
  id: string // ShopManager.id
  user: { id: string; name: string; email: string }
}

export function ManagersPanel({
  shopId,
  initialManagers,
}: {
  shopId: string
  initialManagers: Manager[]
}) {
  const [managers, setManagers] = useState(initialManagers)
  const [email, setEmail] = useState("")
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [isAdding, startAddTransition] = useTransition()
  const [isRemoving, startRemoveTransition] = useTransition()

  function handleAdd() {
    if (!email.trim()) {
      toast.error("Enter an email address")
      return
    }

    setTempPassword(null)

    startAddTransition(async () => {
      const result = await addManager(shopId, email.trim())

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? "Manager added")
      setEmail("")

      if (result.tempPassword) {
        setTempPassword(result.tempPassword)
      }

      // Refresh manager list — easiest way without router.refresh() losing dialog state
      window.location.reload()
    })
  }

  function handleRemove(managerId: string, managerName: string) {
    if (!confirm(`Remove ${managerName} as manager? Their account will not be deleted.`)) return

    startRemoveTransition(async () => {
      const result = await removeManager(shopId, managerId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setManagers((prev) => prev.filter((m) => m.id !== managerId))
      toast.success(`${managerName} removed from this shop`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Manager by Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="manager@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
            />
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </div>

          {/* Show temp password if a new account was created */}
          {tempPassword && (
            <div className="border border-amber-300 bg-amber-50 rounded-md p-3 space-y-1">
              <p className="text-sm font-semibold text-amber-800">
                New manager account created
              </p>
              <p className="text-sm text-amber-700">
                Share this temporary password with them. It will only be shown once:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-white border rounded px-2 py-1 text-sm font-mono">
                  {tempPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword)
                    toast.success("Copied!")
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                The manager must change this password when they first log in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current Managers ({managers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No managers added yet. Add a manager by email above.
            </p>
          ) : (
            <div className="space-y-2">
              {managers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Manager</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRemoving}
                      onClick={() => handleRemove(m.id, m.user.name)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Step 12 — Verify Everything Works

Start the dev server:

```bash
npm run dev
```

Test the full shop owner flow:

1. **Sign up as seller** → `/signup/seller` → lands on `/shop-owner`
2. **Create a shop** → `/shop-owner/new` → fill in name, category → submit → lands on shop dashboard
3. **View shop dashboard** → see product/manager counts
4. **Edit shop** → `/shop-owner/[shopId]/edit` → change name → save → back to dashboard
5. **Products page** → `/shop-owner/[shopId]/products`
   - Left panel: type in search box → products appear
   - Click `+ Add` → dialog opens → enter stock and price → submit → product appears in right panel
   - Click `Edit` on a right panel row → update stock/price → confirm
   - Click `Remove` → confirm → product disappears from inventory
6. **Managers page** → `/shop-owner/[shopId]/managers`
   - Enter an email that doesn't exist in the system → submit → see temp password shown
   - Sign out, sign in as that manager → forced to `/change-password` → set new password → lands on `/manager`
   - Sign back in as shop owner → go to managers page → remove that manager

---

## File Reference — Summary of All Files Created

```
proxy.ts                                           (root)
actions/
  auth.actions.ts
  shop.actions.ts
  shop-product.actions.ts
  manager.actions.ts
app/
  layout.tsx                                        (updated)
  page.tsx
  auth-redirect/page.tsx
  unauthorized/page.tsx
  signup/page.tsx
  signup/seller/page.tsx
  signup/customer/page.tsx
  signin/page.tsx
  forgot-password/page.tsx
  reset-password/page.tsx
  change-password/page.tsx
  profile/page.tsx
  shop-owner/
    layout.tsx
    page.tsx
    new/page.tsx
    [shopId]/
      layout.tsx
      page.tsx
      edit/page.tsx
      edit/_components/edit-shop-form.tsx
      products/page.tsx
      products/_components/shop-products-manager.tsx
      managers/page.tsx
      managers/_components/managers-panel.tsx
components/
  shop-owner/
    navbar.tsx
    shop-subnav.tsx
lib/
  auth.ts                                           (updated)
  auth-client.ts                                    (updated)
```
