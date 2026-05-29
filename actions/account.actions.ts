"use server"

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function completeBuyerSignup(userId: string){

    await prisma.user.update({
        where:{
            id: userId
        },
        data:{
            role:"CUSTOMER"
        }
    })
}

export async function completeSellerSignup(userId: string){

    await prisma.user.update({
        where:{
            id: userId
        },
        data:{
            role:"SHOP_OWNER"
        }
    })
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