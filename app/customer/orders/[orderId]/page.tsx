import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerOrderView } from "./components/customer-order-view";

const RETURN_WINDOW_DAYS = 7;

export default async function CustomerOrderDetailPage({
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
      shop: { select: { name: true } },
      items: true,
      statusHistory: {
        orderBy: { changedAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
      returnRequest: true,
    },
  });
  if (!order) notFound();

  // ProductReview has no back-relation on Order (only an orderId column), so query it directly
  const review = await prisma.productReview.findUnique({
    where: { customerId_orderId: { customerId: session.user.id, orderId } },
  });

  // Return window check
  const deliveredEntry = [...order.statusHistory]
    .reverse()
    .find((h) => h.toStatus === "DELIVERED");
  const withinReturnWindow = deliveredEntry
    ? (Date.now() - deliveredEntry.changedAt.getTime()) /
        (1000 * 60 * 60 * 24) <=
      RETURN_WINDOW_DAYS
    : false;

  let address;
  try {
    address = JSON.parse(order.addressSnapshot);
  } catch {
    address = {
      fullName: "",
      phone: "",
      line: "",
      city: "",
      state: "",
      pincode: "",
    };
  }

  return (
    <CustomerOrderView
      order={{
        id: order.id,
        shopName: order.shop.name,
        status: order.status,
        totalAmount: order.totalAmount,
        cancellationNote: order.cancellationNote,
        createdAt: order.createdAt.toISOString(),
        address,
        items: order.items.map((i) => ({
          id: i.id,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
        history: order.statusHistory.map((h) => ({
          toStatus: h.toStatus,
          changedAt: h.changedAt.toISOString(),
          changedByName: h.changedBy.name,
        })),
        returnRequest: order.returnRequest
          ? {
              status: order.returnRequest.status,
              reason: order.returnRequest.reason,
              rejectionReason: order.returnRequest.rejectionReason,
            }
          : null,
        review: review
          ? { rating: review.rating, comment: review.comment }
          : null,
      }}
      withinReturnWindow={withinReturnWindow}
    />
  );
}
