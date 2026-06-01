"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

// Called after signUp.email() succeeds for seller signup
// Updates the current user's role to SHOP_OWNER
export async function completeSellerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "SHOP_OWNER" },
  })

  return { success: true }
}

// Called after signUp.email() succeeds for customer signup
// Role defaults to CUSTOMER but this confirms it explicitly
export async function completeCustomerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "CUSTOMER" },
  })

  return { success: true }
}

export async function clearMustChangePassword() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  })

  return { success: true }
}