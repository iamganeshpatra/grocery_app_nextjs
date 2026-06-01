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