"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { customerCancelOrder } from "@/actions/order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shop/status-badge";
import { StatusTimeline } from "@/components/shop/status-timeline";
import { StarDisplay } from "@/components/shared/star-rating";

type Data = {
  id: string;
  shopName: string;
  status: string;
  totalAmount: number;
  cancellationNote: string | null;
  createdAt: string;
  address: {
    fullName: string;
    phone: string;
    line: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  history: { toStatus: string; changedAt: string; changedByName: string }[];
  returnRequest: {
    status: string;
    reason: string;
    rejectionReason: string | null;
  } | null;
  review: { rating: number; comment: string | null } | null;
};

export function CustomerOrderView({
  order,
  withinReturnWindow,
}: {
  order: Data;
  withinReturnWindow: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function cancel() {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await customerCancelOrder(order.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Order cancelled");
      router.refresh();
    });
  }

  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link
        href="/customer/orders"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All Orders
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(-6)}</h1>
          <p className="text-sm text-muted-foreground">
            {order.shopName} ·{" "}
            {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-2">{i.productName}</td>
                  <td className="py-2 text-muted-foreground">× {i.quantity}</td>
                  <td className="py-2 text-right">₹{i.unitPrice}</td>
                  <td className="py-2 text-right font-medium">₹{i.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t mt-2 pt-2 font-semibold">
            <span>Total</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Address</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">
            {order.address.fullName} · {order.address.phone}
          </p>
          <p className="text-muted-foreground">
            {order.address.line}, {order.address.city}, {order.address.state} -{" "}
            {order.address.pincode}
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline
            currentStatus={order.status}
            history={order.history}
          />
          {order.status === "CANCELLED" && order.cancellationNote && (
            <p className="text-xs text-red-700 mt-3">
              Note: {order.cancellationNote}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Return status */}
      {order.returnRequest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Return</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Reason: </span>
              {order.returnRequest.reason}
            </p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              <StatusBadge status={order.status} />
            </p>
            {order.returnRequest.status === "REJECTED" &&
              order.returnRequest.rejectionReason && (
                <p className="text-red-700">
                  Rejected: {order.returnRequest.rejectionReason}
                </p>
              )}
          </CardContent>
        </Card>
      )}

      {/* Existing review */}
      {order.review && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <StarDisplay rating={order.review.rating} />
            {order.review.comment && (
              <p className="text-sm mt-1">{order.review.comment}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {order.status === "PENDING" && (
          <Button variant="destructive" onClick={cancel} disabled={isPending}>
            Cancel Order
          </Button>
        )}

        {isDelivered && withinReturnWindow && !order.review && (
          <Button asChild>
            <Link href={`/customer/orders/${order.id}/feedback`}>
              Leave Feedback
            </Link>
          </Button>
        )}

        {isDelivered && withinReturnWindow && !order.returnRequest && (
          <Button variant="outline" asChild>
            <Link href={`/customer/orders/${order.id}/return`}>
              Request Return
            </Link>
          </Button>
        )}

        {isDelivered &&
          !withinReturnWindow &&
          !order.review &&
          !order.returnRequest && (
            <p className="text-sm text-muted-foreground">
              The 7-day return and feedback window has closed.
            </p>
          )}
      </div>
    </div>
  );
}
