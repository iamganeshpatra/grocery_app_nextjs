import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FeedbackForm } from "./components/feedback-form";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { shop: { select: { name: true } }, items: true },
  });
  if (!order) notFound();

  // One review per order — check the ProductReview table directly
  const existingReview = await prisma.productReview.findUnique({
    where: { customerId_orderId: { customerId: session.user.id, orderId } },
  });

  if (order.status !== "DELIVERED" || existingReview) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-muted-foreground">
        This order is not available for feedback.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Leave Feedback</h1>
      <p className="text-sm text-muted-foreground mb-1">
        Order #{order.id.slice(-6)} · {order.shop.name}
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Reviewing: {order.items.map((i) => i.productName).join(", ")}
      </p>
      <FeedbackForm orderId={order.id} />
    </div>
  );
}
