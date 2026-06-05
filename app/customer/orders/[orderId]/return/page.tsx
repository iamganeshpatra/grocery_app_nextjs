import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReturnForm } from "./components/return-form";

const RETURN_WINDOW_DAYS = 7;

export default async function ReturnPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: {
      returnRequest: true,
      statusHistory: {
        where: { toStatus: "DELIVERED" },
        orderBy: { changedAt: "desc" },
        take: 1,
      },
      shop: { select: { name: true } },
    },
  });
  if (!order) notFound();

  // Server-side eligibility check — never trust the UI alone
  const deliveredAt = order.statusHistory[0]?.changedAt;
  const eligible =
    order.status === "DELIVERED" &&
    !order.returnRequest &&
    !!deliveredAt &&
    (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24) <=
      RETURN_WINDOW_DAYS;

  if (!eligible) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-muted-foreground">
        This order is not eligible for a return.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Request a Return</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Order #{order.id.slice(-6)} · {order.shop.name}
      </p>
      <ReturnForm orderId={order.id} />
    </div>
  );
}
