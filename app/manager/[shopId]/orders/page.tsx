import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ManagerOrdersPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!shop) {
    notFound();
  }

  const orders = await prisma.order.findMany({
    where: {
      shopId,
    },
    include: {
      user: true,
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Order #{order.id.slice(-8)}</span>
                <span>{order.status}</span>
              </div>

              <p>Customer: {order.user.name}</p>

              <p>Amount: ₹{order.totalAmount}</p>

              <p>Items: {order.items.length}</p>

              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
