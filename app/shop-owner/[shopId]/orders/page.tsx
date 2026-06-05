import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { statusesForTab } from "@/lib/order-filters";
import { OrdersTabBar } from "@/components/shop/orders-tab-bar";
import { OrdersTable } from "@/components/shop/orders-table";

export default async function ShopOwnerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { shopId } = await params;
  const { tab = "all" } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: session.user.id },
  });
  if (!shop) notFound();

  const statuses = statusesForTab(tab);
  const orders = await prisma.order.findMany({
    where: { shopId, ...(statuses ? { status: { in: statuses } } : {}) },
    include: {
      user: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <OrdersTabBar basePath={`/shop-owner/${shopId}/orders`} showReturns />
      <OrdersTable
        basePath={`/shop-owner/${shopId}/orders`}
        orders={orders.map((o) => ({
          id: o.id,
          customerName: o.user.name,
          itemCount: o._count.items,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
