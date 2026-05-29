import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShopSubNav } from "@/components/shop-owner/shop-subnav";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "SHOP_OWNER") redirect("/unauthorized");

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  });
  if (!shop) notFound();

  return (
    <div>
      <ShopSubNav shopId={shopId} shopName={shop.name} />
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  );
}
