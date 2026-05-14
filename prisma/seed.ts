import { DUMMY_PRODUCTS } from "@/data/data";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function createAdmin(){
    const adminAccount = await prisma.user.findFirst({
        where:{
            role: "ADMIN"
        }
    })
    if(adminAccount) {
        console.info("Admin account already exist, so skipping this.")
        return
    }
    const userAccount = await auth.api.signUpEmail({
        body:{
            email:"admin@admin.com",
            password: process.env.ADMIN_PASSWORD!,
            name:"Admin"
        }
    })
    await prisma.user.update({
        data:{
            role:"ADMIN"
        },
        where:{
            id: userAccount.user.id
        }
    })
    console.info("Admin user created with credentials admin@admin.com")
}


async function addProducts(){
    const productCount = await prisma.product.count()
    if(productCount > 0) {
        console.info("Admin account already exist, so skipping this.")
        return
    }
    await prisma.product.createMany({
        data:DUMMY_PRODUCTS.map(i=>({
            category: i.category,
            name: i.name,
            price:i.price,
            quantity:i.quantity,
            stock:i.stock,
            brand: i.brand,
            imageUrl: i.imageUrl
        })) 
    })
    console.info("Products created")
}


async function main(){
    await createAdmin()
    await addProducts()
}

main().then(()=>{
    console.log("Seed ran successfully")
}).catch(err =>{
    console.error("Seed failed")
    console.error(err)
    
}).finally(async()=>{
    await prisma.$disconnect()
})