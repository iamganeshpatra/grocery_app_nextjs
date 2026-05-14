"use server"

import { prisma } from "@/lib/db"
import { ShopProductWithProduct } from "@/lib/types"


export const addShopProduct = async (userId: string, productId: string):Promise<ShopProductWithProduct> =>{
   
    const shopProduct = await prisma.shopProduct.create({
        data:{
            userId,
            productId,
            stock:0
        },
        include:{
            product: true
        }
    })

    return shopProduct
    
}

export const updateShopProduct = async (shopProductId: string, stock: number):Promise<void> =>{
   
   await prisma.shopProduct.update({
        data:{
           stock: stock
        },
        where:{
            id: shopProductId
        }
    })

    
    
}