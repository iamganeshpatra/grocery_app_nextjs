"use server"

import { Role } from "@/app/generated/prisma/enums"
import { prisma } from "@/lib/db"

export async function completeBuyerSignup(userId: string,role:Role){

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