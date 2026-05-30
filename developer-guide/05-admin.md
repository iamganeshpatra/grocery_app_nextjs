# Developer Guide — 05: Platform Admin

This document covers everything the platform admin (`SUPER_ADMIN`) can do:

- The seed script that creates the admin account and the starter product catalog
- Admin dashboard with platform-wide stats
- The global product catalog — add, edit, delete (with guards), and CSV import
- The users directory — search, filter, deactivate / reactivate
- Shop-owner visibility — read-only drill-down into any owner's shops
- A platform-wide returns overview

There is **no self-registration for admins** — the account is created once by the seed script (PRD §6.1). The admin is read-only for shops: they manage users and the catalog, but never touch a shop's products, orders, or returns.

Work through each section in order.

---

## What You Are Building

```
/admin                                          ← Dashboard (platform stats)
/admin/products                                 ← Global catalog (search, paginated)
/admin/products/import                          ← CSV bulk import
/admin/shop-owners                              ← All SHOP_OWNER users
/admin/shop-owners/[userId]                     ← One owner's shops
/admin/shop-owners/[userId]/shops/[shopId]      ← Read-only shop detail
/admin/users                                    ← All users (search, filter, deactivate)
/admin/returns                                  ← All return requests platform-wide
```

---

## Step 1 — Recreate the Seed Data File

In `01-cleanup.md` you deleted `data/` and `prisma/seed.ts`. Now you rebuild them properly. The catalog is the foundation of the whole platform — shop owners add these products to their shops, and customers browse them.

Create `data/catalog.ts`:

```typescript
// data/catalog.ts

export type SeedProduct = {
  name: string
  description: string
  price: number
  category: string
  quantity: string
  stock: number
  brand: string
  imageUrl: string
}

export const CATALOG: SeedProduct[] = [
  // Grains
  { name: "Basmati Rice", description: "Premium long-grain rice", price: 120, category: "Grains", quantity: "1kg", stock: 100, brand: "India Gate", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400" },
  { name: "Sona Masoori Rice", description: "Light everyday rice", price: 90, category: "Grains", quantity: "1kg", stock: 120, brand: "Local", imageUrl: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400" },
  { name: "Whole Wheat Atta", description: "Stone-ground wheat flour", price: 55, category: "Grains", quantity: "1kg", stock: 150, brand: "Aashirvaad", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400" },
  { name: "Toor Dal", description: "Split pigeon peas", price: 140, category: "Grains", quantity: "1kg", stock: 80, brand: "Tata Sampann", imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400" },

  // Dairy
  { name: "Full Cream Milk", description: "Fresh pasteurised milk", price: 32, category: "Dairy", quantity: "500ml", stock: 60, brand: "Amul", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
  { name: "Paneer", description: "Fresh cottage cheese", price: 90, category: "Dairy", quantity: "200g", stock: 40, brand: "Amul", imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400" },
  { name: "Curd", description: "Thick set curd", price: 45, category: "Dairy", quantity: "400g", stock: 50, brand: "Mother Dairy", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400" },

  // Vegetables
  { name: "Tomatoes", description: "Farm-fresh tomatoes", price: 28, category: "Vegetables", quantity: "1kg", stock: 90, brand: "Local Farm", imageUrl: "https://images.unsplash.com/photo-1546470427-227df1e3c7d7?w=400" },
  { name: "Onions", description: "Red onions", price: 35, category: "Vegetables", quantity: "1kg", stock: 100, brand: "Local Farm", imageUrl: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400" },
  { name: "Potatoes", description: "Everyday potatoes", price: 30, category: "Vegetables", quantity: "1kg", stock: 110, brand: "Local Farm", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400" },

  // Bakery
  { name: "Whole Wheat Bread", description: "Soft sandwich bread", price: 45, category: "Bakery", quantity: "400g", stock: 35, brand: "Britannia", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400" },

  // Beverages
  { name: "Green Tea", description: "Antioxidant-rich green tea", price: 180, category: "Beverages", quantity: "100 bags", stock: 45, brand: "Tetley", imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400" },
]
```

---

## Step 2 — Recreate the Seed Script

Create `prisma/seed.ts`:

```typescript
// prisma/seed.ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CATALOG } from "@/data/catalog"

async function createAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })
  if (existing) {
    console.info("Admin already exists — skipping.")
    return
  }

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not set in .env")
  }

  // Create the account through better-auth so the password is hashed into the account table
  const result = await auth.api.signUpEmail({
    body: {
      email: "admin@grocery.com",
      password: process.env.ADMIN_PASSWORD,
      name: "Platform Admin",
    },
  })

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "SUPER_ADMIN", emailVerified: true },
  })

  console.info("Admin created → admin@grocery.com")
}

async function seedCatalog() {
  const count = await prisma.product.count()
  if (count > 0) {
    console.info(`Catalog already has ${count} products — skipping.`)
    return
  }

  await prisma.product.createMany({ data: CATALOG })
  console.info(`Seeded ${CATALOG.length} products.`)
}

async function main() {
  await createAdmin()
  await seedCatalog()
}

main()
  .then(() => console.info("Seed complete."))
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

`prisma.config.ts` already points the seed command at this file (`seed: "npx tsx prisma/seed.ts"`). Install `tsx` and add the admin password to `.env`:

```bash
npm install -D tsx
```

Add to `.env`:

```env
ADMIN_PASSWORD="ChangeMe@Admin123"
```

Run the seed:

```bash
npx prisma db seed
```

You should see the admin and product counts printed. You can now sign in at `/signin` with `admin@grocery.com` and the password you set.

> **Re-running is safe.** Both functions check for existing data first, so the seed is idempotent.

---

## Step 3 — Create Admin Server Actions

Create `actions/admin.actions.ts`:

```typescript
// actions/admin.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Active statuses = an order that is still "in flight" and counts as using stock
const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED"] as const

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "SUPER_ADMIN") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

// ── Product Catalog ─────────────────────────────────────────────────────────

type ProductInput = {
  name: string
  category: string
  brand?: string
  description?: string
  price: number
  quantity: string
  imageUrl?: string
}

export async function createProduct(data: ProductInput) {
  const { error } = await requireAdmin()
  if (error) return { error }

  if (!data.name.trim()) return { error: "Name is required" }
  if (!data.category.trim()) return { error: "Category is required" }
  if (data.price <= 0) return { error: "Price must be greater than 0" }

  const product = await prisma.product.create({
    data: {
      name: data.name.trim(),
      category: data.category.trim(),
      brand: data.brand?.trim() || null,
      description: data.description?.trim() || null,
      price: data.price,
      quantity: data.quantity.trim() || "1 unit",
      imageUrl: data.imageUrl?.trim() || null,
      stock: 0, // Global reference stock — real stock lives on ShopProduct
    },
  })

  revalidatePath("/admin/products")
  return { data: product }
}

export async function updateProduct(productId: string, data: ProductInput) {
  const { error } = await requireAdmin()
  if (error) return { error }

  if (data.price <= 0) return { error: "Price must be greater than 0" }

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name.trim(),
      category: data.category.trim(),
      brand: data.brand?.trim() || null,
      description: data.description?.trim() || null,
      price: data.price,
      quantity: data.quantity.trim() || "1 unit",
      imageUrl: data.imageUrl?.trim() || null,
    },
  })

  revalidatePath("/admin/products")
  return { data: product }
}

export async function deleteProduct(productId: string) {
  const { error } = await requireAdmin()
  if (error) return { error }

  // Guard 1: block if the product is in any ACTIVE order
  const activeItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { status: { in: ACTIVE_STATUSES as unknown as string[] } },
    },
  })
  if (activeItem) {
    return { error: "This product is in active orders and cannot be deleted." }
  }

  // Guard 2: block if the product has ANY order history (FK integrity — order items
  // reference it). Snapshots keep the order readable, but the row still points here.
  const anyItem = await prisma.orderItem.findFirst({ where: { productId } })
  if (anyItem) {
    return { error: "This product appears in past orders and cannot be deleted." }
  }

  // Safe to delete — first remove dependent rows that have no order history
  await prisma.cart.deleteMany({ where: { productId } })
  await prisma.shopProduct.deleteMany({ where: { productId } }) // removes it from shops
  await prisma.product.delete({ where: { id: productId } })

  revalidatePath("/admin/products")
  return { success: true }
}

export async function bulkCreateProducts(
  rows: { name: string; category: string; brand: string; price: number; quantity: string }[]
) {
  const { error } = await requireAdmin()
  if (error) return { error }

  let created = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.name?.trim() || !row.category?.trim() || !(row.price > 0)) {
      skipped++
      continue
    }
    await prisma.product.create({
      data: {
        name: row.name.trim(),
        category: row.category.trim(),
        brand: row.brand?.trim() || null,
        price: row.price,
        quantity: row.quantity?.trim() || "1 unit",
        stock: 0,
      },
    })
    created++
  }

  revalidatePath("/admin/products")
  return { data: { created, skipped } }
}

// ── User Management ─────────────────────────────────────────────────────────

export async function deactivateUser(userId: string) {
  const { error, session } = await requireAdmin()
  if (error) return { error }

  if (userId === session!.user.id) return { error: "You cannot deactivate yourself." }

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } })
  // Invalidate any active sessions so they are logged out immediately
  await prisma.session.deleteMany({ where: { userId } })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function reactivateUser(userId: string) {
  const { error } = await requireAdmin()
  if (error) return { error }

  await prisma.user.update({ where: { id: userId }, data: { isActive: true } })

  revalidatePath("/admin/users")
  return { success: true }
}
```

---

## Step 4 — Create the Admin Layout and Navbar

```tsx
// app/admin/layout.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AdminNavbar } from "@/components/admin/navbar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar userName={session.user.name} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

```tsx
// components/admin/navbar.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { label: "Dashboard", href: "/admin" },
  { label: "Catalog", href: "/admin/products" },
  { label: "Shop Owners", href: "/admin/shop-owners" },
  { label: "Users", href: "/admin/users" },
  { label: "Returns", href: "/admin/returns" },
]

export function AdminNavbar({ userName }: { userName: string }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut()
    toast.success("Signed out")
    router.push("/signin")
  }

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/admin" className="font-semibold text-lg mr-4">
            ⚙️ Admin
          </Link>
          {links.map((l) => {
            const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors",
                  active ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            )
          })}
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
mkdir -p components/admin
```

---

## Step 5 — Admin Dashboard

```tsx
// app/admin/page.tsx
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboard() {
  const [products, shopOwners, shops, customers, orders, revenueAgg] = await Promise.all([
    prisma.product.count(),
    prisma.user.count({ where: { role: "SHOP_OWNER" } }),
    prisma.shop.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: { totalAmount: true },
    }),
  ])

  const stats = [
    { label: "Products in Catalog", value: products },
    { label: "Shop Owners", value: shopOwners },
    { label: "Shops", value: shops },
    { label: "Customers", value: customers },
    { label: "Total Orders", value: orders },
    { label: "Revenue (Delivered)", value: `₹${(revenueAgg._sum.totalAmount ?? 0).toLocaleString("en-IN")}` },
  ]

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 6 — Product Catalog Page (List + Add + Edit + Delete)

The page is a Server Component that reads the catalog (with search + pagination via `searchParams`) and hands the rows to a client manager for the dialogs.

```tsx
// app/admin/products/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { CatalogManager } from "./_components/catalog-manager"

const PAGE_SIZE = 12

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page = "1" } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const where = q.trim()
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
          { brand: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-sm text-muted-foreground">{total} products</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/products/import">Import CSV</Link>
        </Button>
      </div>

      <CatalogManager
        initialProducts={products}
        query={q}
        page={pageNum}
        totalPages={totalPages}
      />
    </div>
  )
}
```

Now the client component with the search box, the add/edit dialog, and delete:

```tsx
// app/admin/products/_components/catalog-manager.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createProduct, updateProduct, deleteProduct } from "@/actions/admin.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type Product = {
  id: string
  name: string
  category: string
  brand: string | null
  description: string | null
  price: number
  quantity: string
  imageUrl: string | null
}

const CATEGORIES = ["Grains", "Dairy", "Vegetables", "Fruits", "Bakery", "Beverages", "Snacks", "Other"]

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────

function ProductDialog({
  product,
  onClose,
}: {
  product: Product | null // null = create mode
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(product?.name ?? "")
  const [category, setCategory] = useState(product?.category ?? "")
  const [brand, setBrand] = useState(product?.brand ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [price, setPrice] = useState(product ? String(product.price) : "")
  const [quantity, setQuantity] = useState(product?.quantity ?? "")
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "")

  function handleSave() {
    const priceNum = parseFloat(price)
    if (!name.trim()) return toast.error("Name is required")
    if (!category) return toast.error("Select a category")
    if (isNaN(priceNum) || priceNum <= 0) return toast.error("Enter a valid price")

    const payload = {
      name,
      category,
      brand,
      description,
      price: priceNum,
      quantity,
      imageUrl,
    }

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload)

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(product ? "Product updated" : "Product added")
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">{product ? "Edit Product" : "Add Product"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Brand</label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Reference Price (₹) <span className="text-red-500">*</span></label>
            <Input type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Unit</label>
            <Input placeholder="e.g. 1kg, 500ml" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium">Image URL</label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : product ? "Save Changes" : "Add Product"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CatalogManager({
  initialProducts,
  query,
  page,
  totalPages,
}: {
  initialProducts: Product[]
  query: string
  page: number
  totalPages: number
}) {
  const router = useRouter()
  const [search, setSearch] = useState(query)
  const [dialogProduct, setDialogProduct] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function runSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/products?q=${encodeURIComponent(search)}`)
  }

  function openCreate() {
    setDialogProduct(null)
    setDialogOpen(true)
  }
  function openEdit(p: Product) {
    setDialogProduct(p)
    setDialogOpen(true)
  }

  function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}" from the catalog?`)) return
    startTransition(async () => {
      const result = await deleteProduct(p.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`"${p.name}" deleted`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form onSubmit={runSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Search by name, category, or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <Button onClick={openCreate}>+ Add Product</Button>
      </div>

      {initialProducts.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No products found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialProducts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 flex gap-3">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded object-cover bg-muted" />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.brand ? `${p.brand} · ` : ""}{p.quantity}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{p.category}</Badge>
                    <span className="text-sm font-medium">₹{p.price}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleDelete(p)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/admin/products?q=${encodeURIComponent(query)}&page=${page - 1}`)}
          >
            ← Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(`/admin/products?q=${encodeURIComponent(query)}&page=${page + 1}`)}
          >
            Next →
          </Button>
        </div>
      )}

      {dialogOpen && (
        <ProductDialog product={dialogProduct} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  )
}
```

---

## Step 7 — CSV Import Page

The PRD asks for `.xlsx` or `.csv`. To keep the project dependency-free, this guide implements **CSV import** parsed in the browser. (Adding `.xlsx` support is a one-line swap to the [`xlsx`](https://www.npmjs.com/package/xlsx) package later.) Required columns: `name`, `category`, `brand`, `price`, `unit`.

```tsx
// app/admin/products/import/page.tsx
import Link from "next/link"
import { ImportForm } from "./_components/import-form"

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Catalog
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Bulk Import Products</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Upload a CSV with the header row: <code>name,category,brand,price,unit</code>
      </p>
      <ImportForm />
    </div>
  )
}
```

```tsx
// app/admin/products/import/_components/import-form.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { bulkCreateProducts } from "@/actions/admin.actions"
import { Button } from "@/components/ui/button"

type Row = { name: string; category: string; brand: string; price: number; quantity: string }

// Minimal CSV parser — handles simple comma-separated values (no quoted commas)
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const idx = {
    name: header.indexOf("name"),
    category: header.indexOf("category"),
    brand: header.indexOf("brand"),
    price: header.indexOf("price"),
    unit: header.indexOf("unit"),
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(",")
    return {
      name: cols[idx.name]?.trim() ?? "",
      category: cols[idx.category]?.trim() ?? "",
      brand: cols[idx.brand]?.trim() ?? "",
      price: parseFloat(cols[idx.price]?.trim() ?? "0"),
      quantity: cols[idx.unit]?.trim() ?? "1 unit",
    }
  })
}

export function ImportForm() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result))
      if (parsed.length === 0) {
        toast.error("No rows found. Check the header row.")
        return
      }
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  const validCount = rows.filter((r) => r.name && r.category && r.price > 0).length
  const invalidCount = rows.length - validCount

  function handleImport() {
    startTransition(async () => {
      const result = await bulkCreateProducts(rows)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Imported ${result.data!.created} products (${result.data!.skipped} skipped)`)
      router.push("/admin/products")
    })
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="block text-sm"
      />

      {rows.length > 0 && (
        <>
          <div className="text-sm">
            <span className="font-medium">{fileName}</span> — {validCount} valid,{" "}
            {invalidCount > 0 && <span className="text-orange-600">{invalidCount} will be skipped</span>}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Unit</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => {
                  const valid = r.name && r.category && r.price > 0
                  return (
                    <tr key={i} className={valid ? "border-t" : "border-t bg-red-50"}>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2">{r.brand}</td>
                      <td className="p-2">₹{r.price}</td>
                      <td className="p-2">{r.quantity}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Button onClick={handleImport} disabled={isPending || validCount === 0}>
            {isPending ? "Importing…" : `Import ${validCount} Products`}
          </Button>
        </>
      )}
    </div>
  )
}
```

---

## Step 8 — Users Page (Search, Filter, Deactivate)

```tsx
// app/admin/users/page.tsx
import { prisma } from "@/lib/db"
import { UsersTable } from "./_components/users-table"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>
}) {
  const { q = "", role = "" } = await searchParams

  const users = await prisma.user.findMany({
    where: {
      AND: [
        role ? { role: role as "SUPER_ADMIN" | "SHOP_OWNER" | "SHOP_MANAGER" | "CUSTOMER" } : {},
        q.trim()
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <UsersTable
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        query={q}
        role={role}
      />
    </div>
  )
}
```

```tsx
// app/admin/users/_components/users-table.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateUser, reactivateUser } from "@/actions/admin.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

const ROLES = ["", "SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER", "CUSTOMER"]

export function UsersTable({
  initialUsers,
  query,
  role,
}: {
  initialUsers: User[]
  query: string
  role: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(query)
  const [isPending, startTransition] = useTransition()

  function applyFilters(nextRole = role, nextQuery = search) {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set("q", nextQuery.trim())
    if (nextRole) params.set("role", nextRole)
    router.push(`/admin/users?${params.toString()}`)
  }

  function toggleActive(u: User) {
    const action = u.isActive ? deactivateUser : reactivateUser
    const verb = u.isActive ? "Deactivate" : "Reactivate"
    if (!confirm(`${verb} ${u.name}?`)) return

    startTransition(async () => {
      const result = await action(u.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${u.name} ${u.isActive ? "deactivated" : "reactivated"}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <form
          onSubmit={(e) => { e.preventDefault(); applyFilters() }}
          className="flex gap-2 flex-1 min-w-[260px]"
        >
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <select
          value={role}
          onChange={(e) => applyFilters(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r || "All roles"}</option>)}
        </select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
            ) : (
              initialUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3"><Badge variant="secondary">{u.role}</Badge></td>
                  <td className="p-3">
                    {u.isActive
                      ? <Badge className="bg-green-600 text-white">Active</Badge>
                      : <Badge variant="destructive">Deactivated</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    {u.role !== "SUPER_ADMIN" && (
                      <Button
                        size="sm"
                        variant={u.isActive ? "outline" : "default"}
                        disabled={isPending}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Step 9 — Shop-Owner Visibility (Read-Only Drill-Down)

Three nested read-only pages: list of owners → one owner's shops → one shop's detail.

```tsx
// app/admin/shop-owners/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"

export default async function ShopOwnersPage() {
  const owners = await prisma.user.findMany({
    where: { role: "SHOP_OWNER" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { shops: true } } },
  })

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Shop Owners</h1>
      {owners.length === 0 ? (
        <p className="text-muted-foreground">No shop owners yet.</p>
      ) : (
        <div className="space-y-2">
          {owners.map((o) => (
            <Link key={o.id} href={`/admin/shop-owners/${o.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-sm text-muted-foreground">{o.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {o._count.shops} {o._count.shops === 1 ? "shop" : "shops"}
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
// app/admin/shop-owners/[userId]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function OwnerShopsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const owner = await prisma.user.findFirst({
    where: { id: userId, role: "SHOP_OWNER" },
    include: {
      shops: {
        include: {
          _count: { select: { shopProducts: true, orders: true } },
          orders: { where: { status: "DELIVERED" }, select: { totalAmount: true } },
        },
      },
    },
  })
  if (!owner) notFound()

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link href="/admin/shop-owners" className="text-sm text-muted-foreground hover:text-foreground">
        ← All Shop Owners
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{owner.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">{owner.email}</p>

      {owner.shops.length === 0 ? (
        <p className="text-muted-foreground">This shop owner hasn&apos;t created any shops yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {owner.shops.map((shop) => {
            const revenue = shop.orders.reduce((sum, o) => sum + o.totalAmount, 0)
            return (
              <Link key={shop.id} href={`/admin/shop-owners/${owner.id}/shops/${shop.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">{shop.category}</Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex gap-4">
                    <span>{shop._count.shopProducts} products</span>
                    <span>{shop._count.orders} orders</span>
                    <span>₹{revenue.toLocaleString("en-IN")} revenue</span>
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
// app/admin/shop-owners/[userId]/shops/[shopId]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function AdminShopDetailPage({
  params,
}: {
  params: Promise<{ userId: string; shopId: string }>
}) {
  const { userId, shopId } = await params
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: userId },
    include: {
      shopProducts: { include: { product: true } },
      shopManagers: { include: { user: { select: { name: true, email: true } } } },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })
  if (!shop) notFound()

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <Link href={`/admin/shop-owners/${userId}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Owner
        </Link>
        <h1 className="text-2xl font-bold mt-2">{shop.name}</h1>
        <p className="text-sm text-muted-foreground">{shop.category}</p>
        <Badge variant="outline" className="mt-2">Read-only</Badge>
      </div>

      {/* Products */}
      <Card>
        <CardHeader><CardTitle className="text-base">Inventory ({shop.shopProducts.length})</CardTitle></CardHeader>
        <CardContent>
          {shop.shopProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {shop.shopProducts.map((sp) => (
                <div key={sp.id} className="flex justify-between border-b last:border-0 py-1">
                  <span>{sp.product.name}</span>
                  <span className="text-muted-foreground">₹{sp.price} · {sp.stock} in stock</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Managers */}
      <Card>
        <CardHeader><CardTitle className="text-base">Managers ({shop.shopManagers.length})</CardTitle></CardHeader>
        <CardContent>
          {shop.shopManagers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No managers.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {shop.shopManagers.map((m) => (
                <div key={m.id} className="flex justify-between border-b last:border-0 py-1">
                  <span>{m.user.name}</span>
                  <span className="text-muted-foreground">{m.user.email}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
        <CardContent>
          {shop.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {shop.orders.map((o) => (
                <div key={o.id} className="flex justify-between border-b last:border-0 py-1">
                  <span className="font-mono text-xs">#{o.id.slice(-6)}</span>
                  <span>₹{o.totalAmount}</span>
                  <Badge variant="secondary">{o.status}</Badge>
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

## Step 10 — Returns Overview

A read-only, filterable list of every return request on the platform. (The `OrderReturn` table is created in `02-schema.md`; the customer-facing return flow is built in `09-customer-orders-returns.md`. This page simply lists whatever exists.)

```tsx
// app/admin/returns/page.tsx
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { ReturnsFilter } from "./_components/returns-filter"

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = "" } = await searchParams

  const returns = await prisma.orderReturn.findMany({
    where: status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {},
    orderBy: { requestedAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      order: { select: { id: true, shop: { select: { name: true } } } },
    },
  })

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Return Requests</h1>
      <ReturnsFilter current={status} />

      {returns.length === 0 ? (
        <p className="text-muted-foreground mt-6">No return requests found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Shop</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">#{r.order.id.slice(-6)}</td>
                  <td className="p-3">{r.order.shop.name}</td>
                  <td className="p-3">{r.requestedBy.name}</td>
                  <td className="p-3 max-w-xs truncate">{r.reason}</td>
                  <td className="p-3">
                    <Badge className={STATUS_STYLES[r.status] ?? ""}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

```tsx
// app/admin/returns/_components/returns-filter.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
]

export function ReturnsFilter({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex gap-2">
      {TABS.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={current === t.value ? "default" : "outline"}
          onClick={() => router.push(t.value ? `/admin/returns?status=${t.value}` : "/admin/returns")}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
```

---

## Step 11 — Verify the Admin Flow

```bash
npm run dev
```

1. **Sign in** at `/signin` as `admin@grocery.com` → lands on `/admin` with platform stats.
2. **Catalog** → search, add a product (dialog), edit it, try to delete one — it should succeed for an unordered product.
3. **Import** → create a `.csv` with header `name,category,brand,price,unit` and a few rows → upload → preview → import → products appear in the catalog.
4. **Users** → filter by role, search by email. Deactivate a customer, then sign in as that customer in another browser → blocked. Reactivate them.
5. **Shop Owners** → drill in: owner → shop → read-only detail (products, managers, orders).
6. **Returns** → empty for now ("No return requests found"); the tab filters work. It fills up once you build the return flow in doc 09.

---

## File Reference — Files Created in This Document

```
data/catalog.ts
prisma/seed.ts
actions/admin.actions.ts
components/admin/navbar.tsx
app/admin/
  layout.tsx
  page.tsx
  products/
    page.tsx
    _components/catalog-manager.tsx
    import/page.tsx
    import/_components/import-form.tsx
  users/
    page.tsx
    _components/users-table.tsx
  shop-owners/
    page.tsx
    [userId]/page.tsx
    [userId]/shops/[shopId]/page.tsx
  returns/
    page.tsx
    _components/returns-filter.tsx
```

Now proceed to `06-manager.md`.
