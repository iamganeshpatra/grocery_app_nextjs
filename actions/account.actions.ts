"use server"

import { prisma } from "@/lib/db"

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