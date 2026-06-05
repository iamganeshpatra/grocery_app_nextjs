"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  advanceOrderStatus,
  cancelOrderByStaff,
  NEXT_ACTION_LABEL,
} from "@/actions/order.actions";
import {
  approveReturn,
  rejectReturn,
  markRefunded,
} from "@/actions/return.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { StatusTimeline } from "./status-timeline";

export type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};
export type AddressSnapshot = {
  fullName: string;
  phone: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
};
export type HistoryEntry = {
  toStatus: string;
  changedAt: string;
  changedByName: string;
};
export type ReturnInfo = {
  status: string;
  reason: string;
  description: string | null;
  rejectionReason: string | null;
};

export type OrderDetailData = {
  id: string;
  shopName: string;
  status: string;
  totalAmount: number;
  cancellationNote: string | null;
  createdAt: string;
  customerName: string;
  address: AddressSnapshot;
  items: OrderItem[];
  history: HistoryEntry[];
  returnRequest: ReturnInfo | null;
};

const CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"];

export function OrderDetail({
  order,
  canManageReturns = false,
}: {
  order: OrderDetailData;
  canManageReturns?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [note, setNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const nextLabel =
    NEXT_ACTION_LABEL[order.status as keyof typeof NEXT_ACTION_LABEL];

  function run(fn: () => Promise<{ error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(successMsg);
      setShowCancel(false);
      setShowReject(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(-6)}</h1>
          <p className="text-sm text-muted-foreground">
            {order.shopName} · {order.customerName} ·{" "}
            {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-muted-foreground">
                        × {item.quantity}
                      </td>
                      <td className="py-2 text-right">₹{item.unitPrice}</td>
                      <td className="py-2 text-right font-medium">
                        ₹{item.subtotal}
                      </td>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">
                {order.address.fullName} · {order.address.phone}
              </p>
              <p className="text-muted-foreground">
                {order.address.line}, {order.address.city},{" "}
                {order.address.state} - {order.address.pincode}
              </p>
            </CardContent>
          </Card>

          {/* Return request details (owner) */}
          {order.returnRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Return Request</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">Reason: </span>
                  {order.returnRequest.reason}
                </p>
                {order.returnRequest.description && (
                  <p>
                    <span className="text-muted-foreground">Details: </span>
                    {order.returnRequest.description}
                  </p>
                )}
                {order.returnRequest.status === "REJECTED" &&
                  order.returnRequest.rejectionReason && (
                    <p className="text-red-700">
                      Rejection reason: {order.returnRequest.rejectionReason}
                    </p>
                  )}

                {canManageReturns && order.status === "RETURN_REQUESTED" && (
                  <div className="pt-2 space-y-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        run(
                          () => approveReturn(order.id),
                          "Return approved — stock restored",
                        )
                      }
                      disabled={isPending}
                    >
                      Approve Return
                    </Button>
                    {!showReject ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => setShowReject(true)}
                      >
                        Reject Return
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Reason for rejection (required)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() =>
                              run(
                                () => rejectReturn(order.id, rejectReason),
                                "Return rejected",
                              )
                            }
                          >
                            Confirm Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowReject(false)}
                          >
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {canManageReturns && order.status === "RETURN_APPROVED" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      run(() => markRefunded(order.id), "Marked as refunded")
                    }
                    disabled={isPending}
                  >
                    Mark as Refunded
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
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

          {(nextLabel || CANCELLABLE.includes(order.status)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextLabel && (
                  <Button
                    className="w-full"
                    disabled={isPending}
                    onClick={() =>
                      run(() => advanceOrderStatus(order.id), "Order advanced")
                    }
                  >
                    {nextLabel}
                  </Button>
                )}

                {CANCELLABLE.includes(order.status) &&
                  (!showCancel ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowCancel(true)}
                    >
                      Cancel Order
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        placeholder="Reason for cancellation (required)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            run(
                              () => cancelOrderByStaff(order.id, note),
                              "Order cancelled",
                            )
                          }
                        >
                          Confirm Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCancel(false)}
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
