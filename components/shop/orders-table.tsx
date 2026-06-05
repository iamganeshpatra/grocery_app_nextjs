import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { formatDistanceToNow } from "date-fns";

export type OrderRow = {
  id: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export function OrdersTable({
  orders,
  basePath,
}: {
  orders: OrderRow[];
  basePath: string;
}) {
  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        No orders here yet.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">Order</th>
            <th className="text-left p-3">Customer</th>
            <th className="text-left p-3">Items</th>
            <th className="text-left p-3">Total</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Placed</th>
            <th className="text-right p-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t hover:bg-muted/30">
              <td className="p-3 font-mono text-xs">#{o.id.slice(-6)}</td>
              <td className="p-3">{o.customerName}</td>
              <td className="p-3">{o.itemCount}</td>
              <td className="p-3">₹{o.totalAmount}</td>
              <td className="p-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="p-3 text-muted-foreground">
                {formatDistanceToNow(new Date(o.createdAt), {
                  addSuffix: true,
                })}
              </td>
              <td className="p-3 text-right">
                <Link
                  href={`${basePath}/${o.id}`}
                  className="text-sm underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
