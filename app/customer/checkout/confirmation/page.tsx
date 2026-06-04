import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids = "" } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const orderIds = ids.split(",").filter(Boolean);
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, userId: session.user.id },
    include: { shop: { select: { name: true } } },
  });

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-2">Order(s) placed successfully!</h1>
      <p className="text-muted-foreground mb-6">
        {orders.length === 1
          ? "Your order has been placed."
          : `${orders.length} orders were created — one per shop.`}
      </p>

      <div className="space-y-2 text-left">
        {orders.map((o) => (
          <Link key={o.id} href={`/customer/orders/${o.id}`}>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{o.shop.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    #{o.id.slice(-6)}
                  </p>
                </div>
                <span className="font-semibold">₹{o.totalAmount}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button asChild className="mt-6">
        <Link href="/customer">Continue Shopping</Link>
      </Button>
    </div>
  );
}
