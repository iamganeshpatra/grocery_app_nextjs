import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CATALOG } from "@/data/catalog"

async function createAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })
  if (existing) {
    console.info("Admin already exists — skipping.")
    return
  }

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not set in .env")
  }

  // Create the account through better-auth so the password is hashed into the account table
  const result = await auth.api.signUpEmail({
    body: {
      email: "admin@grocery.com",
      password: process.env.ADMIN_PASSWORD,
      name: "Platform Admin",
    },
  })

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "SUPER_ADMIN", emailVerified: true },
  })

  console.info("Admin created → admin@grocery.com")
}

async function seedCatalog() {
  const count = await prisma.product.count()
  if (count > 0) {
    console.info(`Catalog already has ${count} products — skipping.`)
    return
  }

  await prisma.product.createMany({ data: CATALOG })
  console.info(`Seeded ${CATALOG.length} products.`)
}

async function main() {
  await createAdmin()
  await seedCatalog()
}

main()
  .then(() => console.info("Seed complete."))
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })