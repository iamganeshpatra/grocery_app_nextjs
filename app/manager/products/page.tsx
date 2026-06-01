import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShopProductsManager } from "@/app/shop-owner/[shopId]/manage-products/components/shop-products-manager";

export default async function ManagerProductsPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  // Confirm assignment (the layout already did this, but server actions verify again too)
  const assignment = await prisma.shopManager.findFirst({
    where: { shopId, userId: session.user.id },
  });
  if (!assignment) notFound();

  const inventory = await prisma.shopProduct.findMany({
    where: { shopId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <ShopProductsManager
        shopId={shopId}
        initialInventory={inventory}
        isOwner={false}
      />
    </div>
  );
}
