"use server"
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  return session.user; // ✅ already contains role, id, email
}

export type CreateProductType = {
  name: string;
  description?: string;
  price: number;
  quantity: string;
  category: string;
  stock: number;
  imageUrl?: string;
  brand?: string;
};

export async function CreateProduct({
  name,
  description,
  price,
  quantity,
  category,
  stock,
  imageUrl,
  brand,
}: CreateProductType) {
  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      quantity,
      category,
      stock,
      imageUrl,
      brand,
    },
  });
  return product;
}

export async function deleteProduct(id:string) {
  const item=await prisma.product.delete({
    where:{id}
  })
  revalidatePath("/manager")
}

export async function updateProduct(id:string,data:any) {
  const updateItem=await prisma.product.update({
    where:{id},
    data
  })
  revalidatePath("/manager")
}

export const addToCart=async(userId:string,productId:string)=>{
  const cartItem=await prisma.cart.findFirst({
    where:{userId,productId}
  })
  if(cartItem){
    await prisma.cart.update({
      where:{id:cartItem.id},
      data:{quantity:cartItem.quantity+1}
    })
    return
  }

  await prisma.cart.create({
    data:{
      userId,
      productId,
      quantity:1
    }
  })
}

export const removeToCart=async(userId:string,productId:string)=>{
  const cartItem=await prisma.cart.findFirst({
    where:{userId,productId}
  })
  if(!cartItem)return
  if(cartItem.quantity > 1){
    await prisma.cart.update({
      where:{
        id:cartItem.id,
      },
      data:{
        quantity:cartItem.quantity-1
      }
    })
    return
  }

  await prisma.cart.delete({
    where:{
      id:cartItem.id
    }
  })
}