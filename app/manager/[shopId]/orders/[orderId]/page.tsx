import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadOrderDetail } from "@/lib/load-order-detail";
import { OrderDetail } from "@/components/shop/order-detail";

export default async function ManagerOrderDetailPage({
  params,
}: {
  params: Promise<{ shopId: string; orderId: string }>;
}) {
  const { shopId, orderId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const assignment = await prisma.shopManager.findFirst({
    where: { shopId, userId: session.user.id },
  });
  if (!assignment) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
    select: { id: true },
  });
  if (!order) notFound();

  const data = await loadOrderDetail(orderId);
  if (!data) notFound();

  return <OrderDetail order={data} />;
}
