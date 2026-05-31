"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "SUPER_ADMIN") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

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

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED"] as const

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