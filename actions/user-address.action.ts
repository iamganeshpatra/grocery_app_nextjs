"use server"

import { prisma } from "@/lib/db";

type AddAddressType = {
  userId: string;
  fullName: string;
  phone: string;
  houseNo: string;
  area: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};


export const AddUserAddress=async({userId,fullName,phone,houseNo,landmark,area,city,state,pincode,isDefault}
    :AddAddressType)=>{
    if(isDefault){
        await prisma.address.updateMany({
            where:{
                userId
            },
            data:{
                isDefault:false
            }
        })
    }
    const address = await prisma.address.create({
    data: {
      userId,
      fullName,
      phone,
      houseNo,
      landmark,
      area,
      city,
      state,
      pincode,
      isDefault: isDefault || false,
    },
  });

  return address;

}
export const RemoveUserAddress = async (id: string) => {
  await prisma.address.delete({
    where: {
      id,
    },
  });

  return {
    success: true,
  };
};