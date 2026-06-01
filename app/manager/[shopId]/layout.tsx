import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ManagerShopSubNav } from "@/components/manager/shop-subnav";

export default async function ManagerShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "SHOP_MANAGER")
    redirect("/unauthorized");

  // Confirm this manager is assigned to this shop
  const assignment = await prisma.shopManager.findFirst({
    where: { shopId, userId: session.user.id },
    include: { shop: { select: { name: true } } },
  });
  if (!assignment) notFound();

  return (
    <div>
      <ManagerShopSubNav shopId={shopId} shopName={assignment.shop.name} />
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  );
}
