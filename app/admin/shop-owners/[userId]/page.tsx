import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OwnerShopsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const owner = await prisma.user.findFirst({
    where: { id: userId, role: "SHOP_OWNER" },
    include: {
      shops: {
        include: {
          _count: { select: { shopProducts: true, orders: true } },
          orders: {
            where: { status: "DELIVERED" },
            select: { totalAmount: true },
          },
        },
      },
    },
  });
  if (!owner) notFound();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link
        href="/admin/shop-owners"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All Shop Owners
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{owner.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">{owner.email}</p>

      {owner.shops.length === 0 ? (
        <p className="text-muted-foreground">
          This shop owner hasn&apos;t created any shops yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {owner.shops.map((shop) => {
            const revenue = shop.orders.reduce(
              (sum, o) => sum + o.totalAmount,
              0,
            );
            return (
              <Link
                key={shop.id}
                href={`/admin/shop-owners/${owner.id}/shops/${shop.id}`}
              >
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {shop.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex gap-4">
                    <span>{shop._count.shopProducts} products</span>
                    <span>{shop._count.orders} orders</span>
                    <span>₹{revenue.toLocaleString("en-IN")} revenue</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
