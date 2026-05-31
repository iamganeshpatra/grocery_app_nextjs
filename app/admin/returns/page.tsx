import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ReturnsFilter } from "./components/returns-filter";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "" } = await searchParams;

  const returns = await prisma.orderReturn.findMany({
    where: status
      ? { status: status as "PENDING" | "APPROVED" | "REJECTED" }
      : {},
    orderBy: { requestedAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      order: { select: { id: true, shop: { select: { name: true } } } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Return Requests</h1>
      <ReturnsFilter current={status} />

      {returns.length === 0 ? (
        <p className="text-muted-foreground mt-6">No return requests found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Shop</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">
                    #{r.order.id.slice(-6)}
                  </td>
                  <td className="p-3">{r.order.shop.name}</td>
                  <td className="p-3">{r.requestedBy.name}</td>
                  <td className="p-3 max-w-xs truncate">{r.reason}</td>
                  <td className="p-3">
                    <Badge className={STATUS_STYLES[r.status] ?? ""}>
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
