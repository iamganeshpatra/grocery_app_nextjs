"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function requireCustomer() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" as const, session: null }
  if (session.user.role !== "CUSTOMER") return { error: "Forbidden" as const, session: null }
  return { error: null, session }
}

type AddressInput = {
  fullName: string
  phone: string
  houseNo: string
  area: string
  landmark?: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

export async function createAddress(data: AddressInput) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id

  // If this is set as default, unset the previous default first
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
  }

  // If the user has no addresses yet, force this one to be default
  const count = await prisma.address.count({ where: { userId } })

  const address = await prisma.address.create({
    data: {
      userId,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      houseNo: data.houseNo.trim(),
      area: data.area.trim(),
      landmark: data.landmark?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      pincode: data.pincode.trim(),
      isDefault: data.isDefault || count === 0,
    },
  })

  revalidatePath("/customer/addresses")
  revalidatePath("/customer/checkout")
  return { data: address }
}

export async function updateAddress(addressId: string, data: AddressInput) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return { error: "Address not found" }

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
  }

  await prisma.address.update({
    where: { id: addressId },
    data: {
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      houseNo: data.houseNo.trim(),
      area: data.area.trim(),
      landmark: data.landmark?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      pincode: data.pincode.trim(),
      isDefault: data.isDefault,
    },
  })

  revalidatePath("/customer/addresses")
  return { success: true }
}

export async function setDefaultAddress(addressId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id
  await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
  await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } })

  revalidatePath("/customer/addresses")
  return { success: true }
}

export async function deleteAddress(addressId: string) {
  const { error, session } = await requireCustomer()
  if (error) return { error }

  const userId = session!.user.id
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return { error: "Address not found" }

  // PRD rule: an address linked to any Order cannot be deleted (order history integrity)
  const linked = await prisma.order.findFirst({ where: { addressId } })
  if (linked) {
    return { error: "This address is associated with orders and cannot be deleted." }
  }

  await prisma.address.delete({ where: { id: addressId } })
  revalidatePath("/customer/addresses")
  return { success: true }
}