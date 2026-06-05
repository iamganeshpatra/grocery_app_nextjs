import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { customerStatusesForTab } from "@/lib/order-filters";
import { StatusBadge } from "@/components/shop/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerOrdersTabs } from "./components/customer-orders-tabs";

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const statuses = customerStatusesForTab(tab);
  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: {
      shop: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      <CustomerOrdersTabs current={tab} />

      {orders.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20 mt-4">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t placed any orders yet.
          </p>
          <Button asChild>
            <Link href="/customer">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/customer/orders/${o.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex justify-between items-center gap-4">
                  <div>
                    <p className="font-medium">{o.shop.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      #{o.id.slice(-6)} · {o._count.items} item
                      {o._count.items === 1 ? "" : "s"} ·{" "}
                      {new Date(o.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">₹{o.totalAmount}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
