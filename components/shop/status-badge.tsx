import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  DISPATCHED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  RETURN_APPROVED: "bg-teal-100 text-teal-800",
  RETURN_REJECTED: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-gray-200 text-gray-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STYLES[status] ?? "bg-gray-100 text-gray-800"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
